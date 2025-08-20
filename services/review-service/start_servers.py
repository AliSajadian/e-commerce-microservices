import uvicorn
import app.main # This should import your FastAPI app instance

if __name__ == "__main__":
    # Uvicorn will start the FastAPI app, and the startup event in app.main
    # will then start the gRPC server as a background task.
    uvicorn.run(app.main.app, host="0.0.0.0", port=8000)



# import threading
# import uvicorn
# import app.main
# import app.grpc_server
# import asyncio

# def start_rest():
#     uvicorn.run(app.main.app, host="0.0.0.0", port=8000)

# def start_grpc():
#     asyncio.run(app.grpc_server.serve())  # Make sure serve() starts the gRPC server and blocks
#     # loop = asyncio.get_event_loop()  # Get the existing event loop
#     # loop.run_until_complete(app.grpc_server.serve())  # Start the gRPC server with the existing loop

# if __name__ == "__main__":
#     t1 = threading.Thread(target=start_rest)
#     t2 = threading.Thread(target=start_grpc)
#     t1.start()
#     t2.start()
#     t1.join()
#     t2.join()