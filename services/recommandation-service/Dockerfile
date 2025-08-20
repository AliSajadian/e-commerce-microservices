FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly handle passlib and bcrypt versions to fix the compatibility issue.
# Uninstalling them first ensures a clean slate before installing the specific versions.
RUN pip uninstall -y passlib bcrypt || true && \
    pip install --no-cache-dir --default-timeout=100 "passlib==1.7.4" "bcrypt==4.0.1"

# Copy the application code into the container
COPY . .

# Expose both REST and gRPC ports (optional, for documentation)
EXPOSE 8000
EXPOSE 50051

# Specify the command to run the application
CMD ["python", "/app/start_servers.py"]