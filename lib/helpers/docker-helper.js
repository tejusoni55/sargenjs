import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getGlobalLogger as logger } from "./global-logger-helper.js";
import fileHelper from "./file-helper.js";

/**
 * Docker helper for managing centralized Docker Compose setup
 */
const dockerHelper = {
  /**
   * Initialize centralized Docker structure using fileHelper
   * @param {string} projectPath - Path of the project
   * @returns {void}
   */
  _initializeDockerStructure(projectPath) {
    try {
      // Define the basic Docker directory structure
      const dockerStructure = [
        {
          type: "dir",
          name: ["docker"]
        },
        {
          type: "dir",
          name: ["docker/services"]
        },
        {
          type: "dir",
          name: ["docker/data"]
        }
      ];

      // Use fileHelper to create directories
      fileHelper._addDirsAndFiles(projectPath, dockerStructure);

    } catch (error) {
      logger().error(`Failed to initialize Docker structure: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check if Docker setup already exists
   * @param {string} projectPath - Path of the project
   * @returns {boolean} - Whether Docker setup exists
   */
  _dockerSetupExists(projectPath) {
    const dockerComposePath = path.join(projectPath, "docker", "docker-compose.yml");
    return fs.existsSync(dockerComposePath);
  },

  /**
   * Read existing Docker Compose file
   * @param {string} projectPath - Path of the project
   * @returns {Object} - Docker Compose configuration
   */
  _readDockerCompose(projectPath) {
    try {
      const dockerComposePath = path.join(projectPath, "docker", "docker-compose.yml");
      if (!fs.existsSync(dockerComposePath)) {
        return null;
      }
      const content = fs.readFileSync(dockerComposePath, "utf8");
      return yaml.load(content);
    } catch (error) {
      logger().error(`Failed to read Docker Compose file: ${error.message}`);
      return null;
    }
  },

  /**
   * Write Docker Compose file
   * @param {string} dockerComposePath - Full path to docker-compose.yml file
   * @param {Object} composeConfig - Docker Compose configuration
   * @returns {void}
   */
  _writeDockerCompose(dockerComposePath, composeConfig) {
    try {
      const content = yaml.dump(composeConfig, { indent: 2 });
      fs.writeFileSync(dockerComposePath, content);
      logger().verbose("Docker Compose file updated");
    } catch (error) {
      logger().error(`Failed to write Docker Compose file: ${error.message}`);
      throw error;
    }
  },

  /**
   * Merge new service with existing Docker Compose
   * @param {Object} existingCompose - Existing Docker Compose configuration
   * @param {Object} newService - New service configuration
   * @returns {Object} - Merged configuration
   */
  _mergeServices(existingCompose, newService) {
    return {
      ...existingCompose,
      services: {
        ...existingCompose.services,
        ...newService.services
      },
      volumes: {
        ...existingCompose.volumes,
        ...newService.volumes
      },
      networks: {
        ...existingCompose.networks,
        ...newService.networks
      }
    };
  },

  /**
   * Add monitoring services to Docker Compose
   * @param {string} projectPath - Path of the project
   * @param {string} projectName - Name of the project
   * @returns {void}
   */
  _addMonitoringServices(projectPath, projectName) {
    try {
      // Initialize Docker structure if it doesn't exist
      this._initializeDockerStructure(projectPath);

      // Read existing Docker Compose or create new one
      let existingCompose = this._readDockerCompose(projectPath);
      
      // Monitoring services configuration
      const monitoringServices = {
        services: {
          grafana: {
            image: "grafana/grafana-oss:latest",
            container_name: "sargen-grafana",
            restart: "unless-stopped",
            ports: ["3000:3000"],
            environment: {
              GF_AUTH_ANONYMOUS_ENABLED: "true",
              GF_AUTH_ANONYMOUS_ORG_ROLE: "Admin",
              GF_PROVISIONING_PATH: "/etc/grafana/provisioning"
            },
            volumes: [
              "./data/grafana:/var/lib/grafana",
              "./services/monitoring/grafana/grafana.ini:/etc/grafana/grafana.ini",
              "./services/monitoring/grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml"
            ],
            networks: ["sargen-network"]
          },
          prometheus: {
            image: "prom/prometheus:latest",
            container_name: "sargen-prometheus",
            restart: "unless-stopped",
            ports: ["9090:9090"],
            volumes: [
              "./data/prometheus:/prometheus",
              "./services/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml"
            ],
            networks: ["sargen-network"]
          },
          loki: {
            image: "grafana/loki:latest",
            container_name: "sargen-loki",
            restart: "unless-stopped",
            ports: ["8080:3100"],
            volumes: [
              "./data/loki:/loki",
              "./services/monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml"
            ],
            command: "-config.file=/etc/loki/local-config.yaml",
            networks: ["sargen-network"]
          }
        },
        volumes: {
          grafana_data: { driver: "local" },
          prometheus_data: { driver: "local" },
          loki_data: { driver: "local" }
        },
        networks: {
          "sargen-network": { driver: "bridge" }
        }
      };

      // Create base compose if it doesn't exist
      if (!existingCompose) {
        existingCompose = {
          services: {},
          volumes: {},
          networks: {
            "sargen-network": { driver: "bridge" }
          }
        };
      }

      // Merge services
      const mergedCompose = this._mergeServices(existingCompose, monitoringServices);
      
      // Write updated Docker Compose
      const dockerComposePath = path.join(projectPath, "docker", "docker-compose.yml");
      this._writeDockerCompose(dockerComposePath, mergedCompose);

      // Create monitoring service directories and files
      this._createMonitoringServiceFiles(projectPath, projectName);

      logger().success("Monitoring services added to Docker setup");
    } catch (error) {
      logger().error(`Failed to add monitoring services: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create monitoring service files using fileHelper
   * @param {string} projectPath - Path of the project
   * @param {string} projectName - Name of the project
   * @returns {void}
   */
  _createMonitoringServiceFiles(projectPath, projectName) {
    try {
      // Define the structure for monitoring service files
      const monitoringStructure = [
        // Create directories
        {
          type: "dir",
          name: ["docker/services/monitoring/grafana"]
        },
        {
          type: "dir", 
          name: ["docker/services/monitoring/prometheus"]
        },
        {
          type: "dir",
          name: ["docker/services/monitoring/loki"]
        },
        // Create Grafana datasources.yml
        {
          type: "file",
          name: "docker/services/monitoring/grafana/datasources.yml",
          content: `apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100`
        },
        // Create Grafana configuration
        {
          type: "file",
          name: "docker/services/monitoring/grafana/grafana.ini",
          content: `[server]
http_port = 3000
domain = localhost
root_url = http://localhost:3000/

[security]
admin_user = admin
admin_password = admin
secret_key = SW2YcwTIb9zpOOhoPsMm

[auth.anonymous]
enabled = true
org_role = Admin

[users]
allow_sign_up = false
allow_org_create = false
auto_assign_org = true
auto_assign_org_role = Viewer

[log]
mode = console
level = info

[paths]
data = /var/lib/grafana
logs = /var/log/grafana
plugins = /var/lib/grafana/plugins
provisioning = /etc/grafana/provisioning

[database]
type = sqlite3
path = grafana.db

[session]
provider = file
provider_config = sessions

[analytics]
reporting_enabled = false
check_for_updates = false`
        },
        // Create Prometheus configuration
        {
          type: "file",
          name: "docker/services/monitoring/prometheus/prometheus.yml",
          content: `global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-app'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s`
        },
        // Create Loki configuration
        {
          type: "file",
          name: "docker/services/monitoring/loki/loki-config.yml",
          content: `# Minimal Loki configuration for SargenJS monitoring
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
  filesystem:
    directory: /loki/chunks

limits_config:
  allow_structured_metadata: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

analytics:
  reporting_enabled: false`
        }
      ];

      // Use fileHelper to create all directories and files
      fileHelper._addDirsAndFiles(projectPath, monitoringStructure);

    } catch (error) {
      logger().error(`Failed to create monitoring service files: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update package.json with Docker setup completion info
   * @param {string} projectPath - Path of the project
   * @returns {void}
   */
  _updatePackageJsonScripts(projectPath) {
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        logger().warn("package.json not found, skipping Docker scripts update");
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      // Docker setup is complete - users can start services manually
      if (packageJson.scripts.dev) {
        logger().verbose("Docker setup complete - start services manually with docker-compose commands");
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      logger().verbose("Package.json updated with Docker setup info");
    } catch (error) {
      logger().error(`Failed to update package.json scripts: ${error.message}`);
      throw error;
    }
  },

  /**
   * Add database service to Docker Compose
   * @param {string} projectPath - Path of the project
   * @param {string} adapter - Database adapter (mysql or postgres)
   * @param {string} dbPassword - Database password
   * @param {string} rootPassword - Root password
   * @returns {void}
   */
  _addDatabaseService(projectPath, adapter, dbPassword, rootPassword) {
    try {
      // Initialize Docker structure if not exists
      this._initializeDockerStructure(projectPath);

      const dockerComposePath = path.join(projectPath, "docker", "docker-compose.yml");
      
      // Read existing docker-compose.yml
      let dockerCompose = {};
      if (fs.existsSync(dockerComposePath)) {
        const yamlContent = fs.readFileSync(dockerComposePath, 'utf8');
        dockerCompose = yaml.load(yamlContent) || {};
      }

      // Add database service based on adapter
      dockerCompose.services = dockerCompose.services || {};
      
      if (adapter === 'mysql') {
        dockerCompose.services.mysql = {
          image: "mysql:8.0",
          container_name: `${path.basename(projectPath)}-mysql`,
          restart: "unless-stopped",
          environment: {
            MYSQL_ROOT_PASSWORD: rootPassword,
            MYSQL_DATABASE: "database_development",
            MYSQL_USER: "mysql_user",
            MYSQL_PASSWORD: dbPassword
          },
          ports: ["3306:3306"],
          volumes: [
            "./data/mysql:/var/lib/mysql"
          ],
          networks: ["sargen-network"],
          healthcheck: {
            test: ["CMD", "mysqladmin", "ping", "-h", "localhost"],
            timeout: "20s",
            retries: 10
          }
        };
      } else if (adapter === 'postgres') {
        dockerCompose.services.postgres = {
          image: "postgres:latest",
          container_name: `${path.basename(projectPath)}-postgres`,
          restart: "unless-stopped",
          environment: {
            POSTGRES_DB: "database_development",
            POSTGRES_USER: "postgres_user",
            POSTGRES_PASSWORD: dbPassword
          },
          ports: ["5432:5432"],
          volumes: [
            "./data/postgres:/var/lib/postgresql/data"
          ],
          networks: ["sargen-network"],
          healthcheck: {
            test: ["CMD-SHELL", "pg_isready -U postgres_user -d database_development"],
            interval: "10s",
            timeout: "5s",
            retries: 5
          }
        };
      }

      // Ensure networks section exists
      dockerCompose.networks = dockerCompose.networks || {};
      dockerCompose.networks["sargen-network"] = {
        driver: "bridge"
      };

      // Write updated docker-compose.yml
      this._writeDockerCompose(dockerComposePath, dockerCompose);
      
      logger().verbose(`${adapter} service added to Docker Compose`);
    } catch (error) {
      logger().error(`Failed to add ${adapter} service: ${error.message}`);
      throw error;
    }
  },




  /**
   * Add Redis service to Docker Compose
   * @param {string} projectPath - Path of the project
   * @param {string} projectName - Name of the project
   * @returns {void}
   */
  _addRedisService(projectPath, projectName) {
    try {
      // Initialize Docker structure if not exists
      this._initializeDockerStructure(projectPath);

      const dockerComposePath = path.join(projectPath, "docker", "docker-compose.yml");
      
      // Read existing docker-compose.yml
      let dockerCompose = {};
      if (fs.existsSync(dockerComposePath)) {
        const yamlContent = fs.readFileSync(dockerComposePath, 'utf8');
        dockerCompose = yaml.load(yamlContent) || {};
      }

      // Add Redis service
      dockerCompose.services = dockerCompose.services || {};
      dockerCompose.services.redis = {
        image: "redis:7-alpine",
        container_name: `${projectName}-redis`,
        restart: "unless-stopped",
        ports: ["6379:6379"],
        volumes: [
          "./data/redis:/data"
        ],
        networks: ["sargen-network"]
      };

      // Ensure networks section exists
      dockerCompose.networks = dockerCompose.networks || {};
      dockerCompose.networks["sargen-network"] = {
        driver: "bridge"
      };

      // Write updated docker-compose.yml
      this._writeDockerCompose(dockerComposePath, dockerCompose);
      
      logger().verbose("Redis service added to Docker Compose");
    } catch (error) {
      logger().error(`Failed to add Redis service: ${error.message}`);
      throw error;
    }
  }
};

export default dockerHelper;
