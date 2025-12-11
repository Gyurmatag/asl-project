#!/bin/bash

cat /usr/local/app/docker/conf/frontend-art.txt

echo ""
echo "Cleaning cache..."
rm -rf .next
rm -f package-lock.json

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Starting Next.js development server..."
npm run dev
