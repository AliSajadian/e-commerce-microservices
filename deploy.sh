#!/bin/bash

# E-Commerce Microservices Deployment Script
set -e

echo "🚀 Starting E-Commerce Microservices Deployment..."

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f infrastruture/kubernetes/namespace.yaml

# Apply configurations
echo "⚙️  Applying configurations..."
kubectl apply -f infrastruture/kubernetes/config/configmap.yaml
kubectl apply -f infrastruture/kubernetes/config/secret.yaml

# Deploy infrastructure
echo "🏗️  Deploying infrastructure services..."
kubectl apply -f infrastruture/kubernetes/infrastructure/postgresql/postgresql-deployment.yaml
kubectl apply -f infrastruture/kubernetes/infrastructure/redis/redis-deployment.yaml
kubectl apply -f infrastruture/kubernetes/infrastructure/rabbitmq/rabbitmq-deployment.yaml
kubectl apply -f infrastruture/kubernetes/infrastructure/mongodb/mongodb-deployment.yaml

# Wait for infrastructure to be ready
echo "⏳ Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=postgresql -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n ecommerce --timeout=300s

# Deploy microservices
echo "🔧 Deploying microservices..."
kubectl apply -f infrastruture/kubernetes/services/auth-service/auth-service-deployment.yaml
kubectl apply -f infrastruture/kubernetes/services/product-service/product-service-deployment.yaml
kubectl apply -f infrastruture/kubernetes/services/order-service/order-service-deployment.yaml
kubectl apply -f infrastruture/kubernetes/services/payment-service/payment-service-deployment.yaml
kubectl apply -f infrastruture/kubernetes/services/notification-service/notification-service-deployment.yaml
kubectl apply -f infrastruture/kubernetes/services/review-service/review-service-deployment.yaml
kubectl apply -f infrastruture/kubernetes/services/recommendation-service/recommendation-service-deployment.yaml

# Deploy monitoring
echo "📊 Deploying monitoring stack..."
kubectl apply -f infrastruture/kubernetes/monitoring/prometheus-deployment.yaml
kubectl apply -f infrastruture/kubernetes/monitoring/grafana-deployment.yaml

# Deploy logging
echo "📝 Deploying logging stack..."
kubectl apply -f infrastruture/kubernetes/logging/elasticsearch-deployment.yaml

# Deploy ingress
echo "🌐 Deploying ingress..."
kubectl apply -f infrastruture/kubernetes/ingress/ingress.yaml

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=auth-service -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=product-service -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=order-service -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=payment-service -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=notification-service -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=review-service -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=recommendation-service -n ecommerce --timeout=300s

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Service URLs:"
echo "  - Auth Service: http://localhost:8000"
echo "  - Product Service: http://localhost:8001"
echo "  - Order Service: http://localhost:3000"
echo "  - Payment Service: http://localhost:3001"
echo "  - Notification Service: http://localhost:3002"
echo "  - Review Service: http://localhost:8002"
echo "  - Recommendation Service: http://localhost:8003"
echo ""
echo "📊 Monitoring:"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3000"
echo "  - Kibana: http://localhost:5601"
echo ""
echo "🔧 Management:"
echo "  - RabbitMQ Management: http://localhost:15672 (admin/admin)"
echo "  - Redis: localhost:6379"
echo ""
echo "To check status: kubectl get pods -n ecommerce"
echo "To view logs: kubectl logs -f deployment/auth-service -n ecommerce"

