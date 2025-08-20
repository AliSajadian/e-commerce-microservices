import uvicorn
import app.main # This should import your FastAPI app instance
import app.product.models

if __name__ == "__main__":
    # Uvicorn will start the FastAPI app, and the startup event in app.main
    # will then start the gRPC server as a background task.
    uvicorn.run(app.main.app, host="0.0.0.0", port=8000)