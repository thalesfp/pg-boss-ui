#!/bin/bash

# Setup script for creating a PostgreSQL user with exclusive pg-boss access
# Usage: ./setup-pgboss-user.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== PostgreSQL pg-boss User Setup ==="
echo ""

# Prompt for configuration
read -p "Enter database name: " DB_NAME
read -p "Enter new username (default: pgboss_user): " DB_USER
DB_USER=${DB_USER:-pgboss_user}

read -sp "Enter password for $DB_USER: " DB_PASSWORD
echo ""

read -p "Enter pg-boss schema name (default: pgboss): " SCHEMA_NAME
SCHEMA_NAME=${SCHEMA_NAME:-pgboss}

read -p "Enter PostgreSQL admin user (default: postgres): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-postgres}

read -p "Enter PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -sp "Enter password for PostgreSQL admin user '$ADMIN_USER': " ADMIN_PASSWORD
echo ""

echo ""
echo -e "${YELLOW}Creating user '$DB_USER' with access to schema '$SCHEMA_NAME' in database '$DB_NAME'...${NC}"
echo ""

# Create SQL commands
SQL_COMMANDS=$(cat <<EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant usage on the pg-boss schema
GRANT USAGE ON SCHEMA $SCHEMA_NAME TO $DB_USER;

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA $SCHEMA_NAME TO $DB_USER;

-- Grant permissions on all sequences (needed for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA $SCHEMA_NAME TO $DB_USER;

-- Grant permissions on all functions (pg-boss may use stored procedures)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA $SCHEMA_NAME TO $DB_USER;

-- Grant permissions on future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA $SCHEMA_NAME
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA $SCHEMA_NAME
  GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA $SCHEMA_NAME
  GRANT EXECUTE ON FUNCTIONS TO $DB_USER;

-- Restrict access to only pg-boss schema (make it exclusive)
REVOKE ALL ON SCHEMA public FROM $DB_USER;
REVOKE CREATE ON SCHEMA public FROM $DB_USER;

-- Grant database connection
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
EOF
)

# Execute SQL commands
if PGPASSWORD=$ADMIN_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d "$DB_NAME" -c "$SQL_COMMANDS" 2>/dev/null; then
    echo -e "${GREEN}✓ User '$DB_USER' created successfully!${NC}"
    echo ""
    echo "Connection string:"
    echo -e "${GREEN}postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=$SCHEMA_NAME${NC}"
    echo ""
    echo "You can now use this connection string in pg-boss-ui."
else
    echo -e "${RED}✗ Failed to create user. Please check your PostgreSQL admin credentials.${NC}"
    echo ""
    echo "You can run the SQL commands manually:"
    echo "$SQL_COMMANDS"
    exit 1
fi
