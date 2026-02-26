#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Install Redis
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Configure Redis
sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1 ::1/g' /etc/redis/redis.conf
sed -i 's/# maxmemory <bytes>/maxmemory 200mb/g' /etc/redis/redis.conf
sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/g' /etc/redis/redis.conf
systemctl restart redis-server

# Add ubuntu user to docker group
usermod -aG docker ubuntu

echo "Server initialization complete"
