import logging
import asyncio # Keep this for general async context, though not directly used in the functions here now
from uuid import UUID

import grpc
from concurrent import futures
from sqlalchemy import select

# If you want to enable gRPC reflection (useful for tools like grpcurl), uncomment this:
# from grpc_reflection.v1alpha import reflection

from generated import auth_pb2, auth_pb2_grpc
from app.auth.models import User  # Your SQLAlchemy User model
from app.core.database import AsyncSessionLocal # Your async session factory

# Configure logging to show all messages, including DEBUG
logging.basicConfig(level=logging.ERROR, format='%(levelname)s:%(name)s:%(message)s')
# If you want to see INFO and DEBUG from SQLAlchemy, you can adjust its logger specifically:
# logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)


# It's good practice to have a way to store and stop the server instance
_grpc_server_instance = None

async def start_grpc_server_background():
    """
    Starts the gRPC server in the background as an asyncio task.
    This function should be called within an existing asyncio event loop.
    """
    global _grpc_server_instance
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    # Add your AuthServiceServicer to the server
    # AuthServiceServicer is defined within this same file, so no import from self needed
    auth_pb2_grpc.add_AuthServiceServicer_to_server(AuthServiceServicer(), server)

    listen_addr = '[::]:50051' # Ensure this is the correct gRPC port for your setup
    server.add_insecure_port(listen_addr)
    logging.info(f"gRPC server starting as a background task on {listen_addr}")

    await server.start()
    _grpc_server_instance = server # Store the server instance for graceful shutdown

async def stop_grpc_server_background():
    """
    Stops the gRPC server gracefully.
    """
    global _grpc_server_instance
    if _grpc_server_instance:
        logging.info("gRPC server stopping...")
        # Stop with a grace period (e.g., 5 seconds) to allow in-flight RPCs to complete
        await _grpc_server_instance.stop(grace=5)
        _grpc_server_instance = None
        logging.info("gRPC server stopped.")


class AuthServiceServicer(auth_pb2_grpc.AuthServiceServicer):
    """
    Implements the gRPC AuthService service.
    """
    async def GetUserDetails(self, request: auth_pb2.GetUserDetailsRequest, context: grpc.aio.ServicerContext):
        """
        Handles the GetUserDetails RPC call to retrieve user details by ID.
        """
        try:
            user_id_str = request.user_id
            logging.error(f"DEBUG: Received User ID (string): {user_id_str}")
            logging.error(f"DEBUG: Type of received User ID: {type(user_id_str)}")

            try:
                user_id_uuid = UUID(user_id_str)
                logging.error(f"DEBUG: Converted User ID (UUID): {user_id_uuid}")
                logging.error(f"DEBUG: Type of converted User ID: {type(user_id_uuid)}")
            except ValueError as ve:
                logging.error(f"ERROR: Invalid UUID format received: {user_id_str} - {ve}")
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid user ID format.")
                return # Important: return after aborting context

            async with AsyncSessionLocal() as session:
                # Construct the SQLAlchemy select statement to find the User by ID
                stmt = select(User).where(User.id == user_id_uuid)
                logging.error(f"DEBUG: SQLAlchemy Statement to execute: {stmt}")

                # Execute the statement asynchronously
                result = await session.execute(stmt)

                # --- CRITICAL FIX: Use scalars().first() directly to get the ORM object ---
                # This method is designed to unwrap single-entity results into ORM objects.
                # It will return None if no matching row is found.
                user = result.scalars().first()

                logging.error(f"DEBUG: Fetched User object directly using scalars().first(): {user}")

                if not user:
                    logging.error(f"+++++++Grpc_server: User with ID {user_id_str} not found in database.")
                    # Abort the gRPC context with NOT_FOUND status
                    await context.abort(grpc.StatusCode.NOT_FOUND, "User not found!")
                    return # Important: return after aborting context

                # If user is found, construct and return the response
                logging.error(f"DEBUG: User FOUND in DB! ID: {user.id}, First Name: {user.first_name}")
                return auth_pb2.UserDetailsResponse(
                    user_id=str(user.id),
                    first_name=user.first_name,
                    last_name=user.last_name,
                )

        except Exception as e:
            # Catch any unexpected errors during the RPC call
            logging.exception(f"DEBUG: Unhandled Error fetching user details: {e}")
            # Abort the gRPC context with an INTERNAL error status
            await context.abort(grpc.StatusCode.INTERNAL, "Internal error occurred!")
            return # Important: return after aborting context

