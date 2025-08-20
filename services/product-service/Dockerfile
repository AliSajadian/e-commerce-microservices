FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY . .

# Expose both REST and gRPC ports (optional, for documentation)
EXPOSE 8000
EXPOSE 50051

# Specify the command to run the application
CMD ["python", "/app/start_servers.py"]
