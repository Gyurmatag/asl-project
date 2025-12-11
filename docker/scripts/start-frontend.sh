#!/bin/bash

cat /usr/local/app/docker/conf/frontend-art.txt

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Starting Next.js development server..."
npm run dev

