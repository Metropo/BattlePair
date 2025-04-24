# Docker Setup for BattlePair

This directory contains the Docker configuration for the BattlePair application.

## Local Development

To run the application locally using Docker:

1. Make sure Docker and Docker Compose are installed
2. Navigate to the project root directory
3. Run:
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```
4. Access the application at http://localhost:3000

## Production Deployment

For production deployment, you can use the Docker image built by GitHub Actions:

1. Download the latest artifact from the GitHub Actions workflow
2. Import the image into Portainer:
   - Go to Images section
   - Click "Import image from file"
   - Select the downloaded `battlepair.tar.gz` file
   - Click "Import"

3. Create a new container:
   - Click "Add container"
   - Select the imported image
   - Configure the following:
     - Name: `battlepair`
     - Port mapping: `127.0.0.1:3000:3000`
     - Volume mapping: `/path/to/database:/app/backend/database`
     - Restart policy: `Unless stopped`

## Environment Variables

The following environment variables can be set:

- `NODE_ENV`: Set to 'production' for production deployment
- `PORT`: Override the default port (3000)

## Database Persistence

The SQLite database file is stored in the `/app/backend/database` directory. Make sure to mount this directory as a volume to persist data between container restarts.

## GitHub Actions

The GitHub Actions workflow automatically builds the Docker image and saves it as a compressed tar file on every push to the main branch. The artifact is available for 5 days after the workflow run. 