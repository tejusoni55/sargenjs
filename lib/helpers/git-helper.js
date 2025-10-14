import { getGlobalLogger as logger } from "./global-logger-helper.js";
import cliHelper from "./command-helper.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Git helper for managing git repository operations
 * This helper provides methods for git repository initialization and management
 */
const gitHelper = {
  /**
   * Checks if git is installed and available in the system
   * @returns {Promise<boolean>} True if git is available, false otherwise
   */
  async _checkGitInstallation() {
    try {
      const result = await cliHelper._runCommand("git --version");
      if (result.success) {
        logger().verbose(`Git found: ${result.stdout.trim()}`);
        return true;
      }
      return false;
    } catch (error) {
      logger().error("Git is not installed or not available in PATH");
      logger().info("Please install Git from: https://git-scm.com/downloads");
      return false;
    }
  },

  /**
   * Checks if git user configuration is set up
   * @returns {Promise<Object>} Object with name and email configuration status
   */
  async _checkGitConfiguration() {
    try {
      const nameResult = await cliHelper._runCommand("git config user.name");
      const emailResult = await cliHelper._runCommand("git config user.email");

      const hasName = nameResult.success && nameResult.stdout.trim();
      const hasEmail = emailResult.success && emailResult.stdout.trim();

      if (!hasName || !hasEmail) {
        logger().warn("Git user configuration not found:");
        if (!hasName) {
          logger().warn("- Missing user.name");
        }
        if (!hasEmail) {
          logger().warn("- Missing user.email");
        }
        logger().info("Please configure Git with:");
        logger().info('git config --global user.name "Your Name"');
        logger().info('git config --global user.email "your.email@example.com"');
        return { configured: false, hasName, hasEmail };
      }

      logger().verbose(`Git configured for: ${nameResult.stdout.trim()} <${emailResult.stdout.trim()}>`);
      return { configured: true, hasName, hasEmail };
    } catch (error) {
      logger().error("Error checking git configuration:", error.message);
      return { configured: false, hasName: false, hasEmail: false };
    }
  },

  /**
   * Validates if the provided URL is a valid git repository URL
   * @param {string} url - The URL to validate
   * @returns {boolean} True if valid, false otherwise
   */
  _validateGitUrl(url) {
    try {
      // Basic URL validation for common git hosting services
      const gitUrlPattern = /^(https?:\/\/|git@)(github\.com|gitlab\.com|bitbucket\.org|dev\.azure\.com|.*\.dev\.azure\.com)\/.*\.git$/i;
      const sshPattern = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._/-]+\.git$/;
      
      return gitUrlPattern.test(url) || sshPattern.test(url) || url.startsWith('https://') || url.startsWith('git@');
    } catch (error) {
      return false;
    }
  },

  /**
   * Checks if GitHub CLI is installed and authenticated
   * @param {boolean} verbose - Whether to show verbose output
   * @returns {Promise<Object>} Object with ghInstalled and ghAuthenticated status
   */
  async _checkGitHubCLI(verbose = false) {
    try {
      // Check if gh CLI is installed
      const ghVersionResult = await cliHelper._runCommand("gh --version");
      if (!ghVersionResult.success) {
        logger().verbose(`GitHub CLI not found: ${ghVersionResult.stderr}`);
        return { ghInstalled: false, ghAuthenticated: false };
      }

      logger().verbose(`GitHub CLI found: ${ghVersionResult.stdout}`);

      // Check if gh is authenticated
      const ghAuthResult = await cliHelper._runCommand("gh auth status");
      if (!ghAuthResult.success) {
        logger().verbose(`GitHub CLI not authenticated: ${ghAuthResult.stderr}`);
        return { ghInstalled: true, ghAuthenticated: false };
      }

      logger().verbose(`GitHub CLI authenticated: ${ghAuthResult.stdout}`);
      return {
        ghInstalled: true,
        ghAuthenticated: true
      };
    } catch (error) {
      logger().verbose(`GitHub CLI check error: ${error.message}`);
      return { ghInstalled: false, ghAuthenticated: false };
    }
  },

  /**
   * Gets the default branch name from remote repository
   * @param {boolean} verbose - Whether to show verbose output
   * @returns {Promise<string>} Default branch name (main, master, etc.)
   */
  async _getRemoteDefaultBranch(verbose = false) {
    try {
      // First, fetch remote info
      const fetchResult = await cliHelper._runCommand("git fetch origin");
      if (!fetchResult.success) {
        logger().verbose(`Could not fetch remote: ${fetchResult.stderr}`);
        return "main"; // Default fallback
      }

      // Get the default branch from remote
      const branchResult = await cliHelper._runCommand("git symbolic-ref refs/remotes/origin/HEAD");
      if (branchResult.success) {
        const defaultBranch = branchResult.stdout.trim().replace("refs/remotes/origin/", "");
        logger().verbose(`Remote default branch detected: ${defaultBranch}`);
        return defaultBranch;
      }

      // Fallback: check what branches exist on remote
      const remoteBranchesResult = await cliHelper._runCommand("git branch -r");
      if (remoteBranchesResult.success) {
        const branches = remoteBranchesResult.stdout.trim().split('\n');
        // Look for main first, then master
        for (const branch of branches) {
          const branchName = branch.trim().replace("origin/", "");
          if (branchName === "main") {
            logger().verbose(`Remote default branch detected: main`);
            return "main";
          }
        }
        for (const branch of branches) {
          const branchName = branch.trim().replace("origin/", "");
          if (branchName === "master") {
            logger().verbose(`Remote default branch detected: master`);
            return "master";
          }
        }
      }

      logger().verbose(`Could not detect remote default branch, using: main`);
      return "main"; // Default fallback
    } catch (error) {
      logger().verbose(`Error detecting remote default branch: ${error.message}`);
      return "main"; // Default fallback
    }
  },

  /**
   * Creates a GitHub repository using GitHub CLI
   * @param {string} repoName - Name of the repository
   * @param {Object} options - Repository options
   * @param {boolean} verbose - Whether to show verbose output
   * @returns {Promise<string>} Repository URL
   */
  async _createGitHubRepository(repoName, options = {}, verbose = false) {
    try {
      const isPrivate = options.private !== undefined ? options.private : true; // Default to private
      const description = options.description || "Created with SargenJS";
      
      // Create repository using GitHub CLI (without --push to control the process)
      const createCommand = `gh repo create ${repoName} --${isPrivate ? 'private' : 'public'} --description "${description}" --source=. --remote=origin`;
      logger().verbose(`Creating GitHub repository: ${repoName}`);
      
      const createResult = await cliHelper._runCommand(createCommand)
      if (!createResult.success) {
        // Check for specific GitHub API errors
        const errorMessage = createResult.stderr || createResult.stdout;
        if (errorMessage.includes("already exists") || errorMessage.includes("Name already exists")) {
          throw new Error(`Repository '${repoName}' already exists on this account`);
        }
        throw new Error(`Failed to create GitHub repository: ${errorMessage}`);
      }

      // Extract repository URL from output
      const username = await this._getGitHubUsername();
      const repoUrl = `https://github.com/${username}/${repoName}.git`;
      logger().success(`GitHub repository created: ${repoUrl}`);
      
      return repoUrl;
    } catch (error) {
      throw new Error(`GitHub repository creation failed: ${error.message}`);
    }
  },

  /**
   * Gets GitHub username from git config or gh CLI
   * @returns {string} GitHub username
   */
  async _getGitHubUsername() {
    try {
      // Try to get username from gh CLI
      const ghUserResult = await cliHelper._runCommand("gh api user --jq .login");
      if (ghUserResult.success && ghUserResult.stdout.trim()) {
        return ghUserResult.stdout.trim();
      }

      // Fallback to git config
      const gitUserResult = await cliHelper._runCommand("git config user.name");
      if (gitUserResult.success && gitUserResult.stdout.trim()) {
        return gitUserResult.stdout.trim().toLowerCase().replace(/\s+/g, '-');
      }

      throw new Error("Could not determine GitHub username");
    } catch (error) {
      throw new Error("Could not determine GitHub username");
    }
  },

  /**
   * Creates .gitignore file in the project directory
   * @param {string} projectPath - Path to the project directory
   */
  _createGitignore(projectPath) {
    try {
      const gitignorePath = path.join(projectPath, ".gitignore");
      
      // Check if .gitignore already exists
      if (fs.existsSync(gitignorePath)) {
        logger().info(".gitignore already exists, skipping creation");
        return;
      }

      // Read the template
      const templatePath = path.join(__dirname, "../templates/git/gitignore-template");
      const template = fs.readFileSync(templatePath, "utf8");
      
      // Write the .gitignore file
      fs.writeFileSync(gitignorePath, template);
      logger().success(".gitignore file created");
    } catch (error) {
      logger().warn(`Could not create .gitignore file: ${error.message}`);
    }
  },

  /**
   * Checks if the current directory is already a git repository
   * @param {string} projectPath - Path to the project directory
   * @returns {boolean} True if already a git repository, false otherwise
   */
  _isGitRepository(projectPath) {
    const gitPath = path.join(projectPath, ".git");
    return fs.existsSync(gitPath);
  },

  /**
   * Performs pre-flight checks before git setup
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Git setup options
   * @returns {Promise<boolean>} True if all checks pass, false otherwise
   */
  async _preflightChecks(projectPath, options = {}) {
    try {
      logger().verbose("Performing git setup pre-flight checks...");

      // Check if git is installed
      const gitInstalled = await this._checkGitInstallation();
      if (!gitInstalled) {
        throw new Error("Git is not installed or not available");
      }

      // Check if already a git repository
      if (this._isGitRepository(projectPath)) {
        throw new Error("Project is already a git repository");
      }

      // Check git configuration
      const gitConfig = await this._checkGitConfiguration();
      if (!gitConfig.configured) {
        logger().warn("Git user configuration is incomplete, but continuing...");
        logger().warn("You may need to configure git before making commits");
      }

      // Validate remote URL if provided
      if (options.remote && !this._validateGitUrl(options.remote)) {
        throw new Error(`Invalid remote repository URL: ${options.remote}`);
      }

      logger().success("All pre-flight checks passed");
      return true;
    } catch (error) {
      logger().error(`Pre-flight check failed: ${error.message}`);
      return false;
    }
  },

  /**
   * Handles git operation errors gracefully
   * @param {Error} error - The error that occurred
   * @param {string} operation - The operation that failed
   * @returns {boolean} True if error was handled gracefully, false if should exit
   */
  _handleGitErrors(error, operation) {
    const errorMessage = error.message.toLowerCase();

    switch (operation) {
      case "init":
        if (errorMessage.includes("already exists") || errorMessage.includes("already a git repository")) {
          logger().warn("Git repository already initialized");
          return true; // Continue with other operations
        }
        break;

      case "remote":
        if (errorMessage.includes("already exists")) {
          logger().warn("Remote origin already exists");
          return true;
        }
        break;

      case "push":
        if (errorMessage.includes("authentication") || errorMessage.includes("permission")) {
          logger().error("Authentication failed. Please check your credentials.");
          logger().info("You can push manually later with: git push -u origin main");
          return true;
        }
        if (errorMessage.includes("network") || errorMessage.includes("connection")) {
          logger().error("Network error occurred during push.");
          logger().info("You can push manually later with: git push -u origin main");
          return true;
        }
        break;

      case "commit":
        if (errorMessage.includes("nothing to commit")) {
          logger().warn("No changes to commit");
          return true;
        }
        break;
    }

    return false; // Unhandled error, should exit
  },

  /**
   * Sets up git repository with fault tolerance
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Git setup options
   */
  async _setupGitRepository(projectPath, options = {}) {
    try {
      logger().verbose("Setting up git repository...");

      // Perform pre-flight checks
      const checksPassed = await this._preflightChecks(projectPath, options);
      if (!checksPassed) {
        logger().error("Git setup aborted due to pre-flight check failures");
        return;
      }

      // .gitignore file should already exist from project initialization

      // Change to project directory
      const originalCwd = process.cwd();
      process.chdir(projectPath);

      try {
        const verbose = logger().isVerbose();

        // Initialize git repository
        logger().verbose("Initializing git repository...");
        const initResult = await cliHelper._runCommand("git init");
        if (!initResult.success) {
          if (!this._handleGitErrors(new Error(initResult.stderr), "init")) {
            throw new Error(`Git init failed: ${initResult.stderr}`);
          }
        } else {
          logger().success("Git repository initialized");
        }

        // Ensure we have a branch before committing (git init doesn't create a branch until first commit)
        const currentBranchResult = await cliHelper._runCommand("git branch --show-current");
        if (!currentBranchResult.success || !currentBranchResult.stdout.trim()) {
          // No current branch, create one
          logger().verbose("Creating main branch...");
          const createBranchResult = await cliHelper._runCommand("git checkout -b main");
          if (!createBranchResult.success) {
            logger().warn(`Could not create main branch: ${createBranchResult.stderr}`);
          } else {
            logger().success("Created main branch");
          }
        }

        // Add all files
        logger().verbose("Adding files to git...");
        const addResult = await cliHelper._runCommand("git add .");
        if (!addResult.success) {
          throw new Error(`Git add failed: ${addResult.stderr}`);
        }
        logger().success("Files added to git");

        // Create initial commit
        const commitMessage = options.message || "Initial commit: Project Setup";
        logger().verbose(`Creating initial commit: "${commitMessage}"`);
        const commitResult = await cliHelper._runCommand(`git commit -m "${commitMessage}"`);
        if (!commitResult.success) {
          if (!this._handleGitErrors(new Error(commitResult.stderr), "commit")) {
            throw new Error(`Git commit failed: ${commitResult.stderr}`);
          }
        } else {
          logger().success("Initial commit created");
        }

        // Setup remote - either provided or create automatically
        let remoteUrl = options.remote;
        
        if (!remoteUrl) {
          // No remote provided, try to auto-create GitHub repository silently
          logger().verbose("No remote URL provided, checking GitHub CLI...");
          const ghStatus = await this._checkGitHubCLI(verbose);
          logger().verbose(`GitHub CLI status: installed=${ghStatus.ghInstalled}, authenticated=${ghStatus.ghAuthenticated}`);
          
          if (ghStatus.ghInstalled && ghStatus.ghAuthenticated) {
            // GitHub CLI is available and authenticated, try to create repository
            try {
              const projectName = path.basename(projectPath);
              const repoOptions = {
                private: options.public ? false : true, // Default to private unless --public is specified
                description: options.description || "Created with SargenJS"
              };
              
              remoteUrl = await this._createGitHubRepository(projectName, repoOptions, verbose);
              logger().success("GitHub repository created successfully!");
            } catch (error) {
              // If GitHub CLI fails, show warning and fall back to local-only
              if (error.message.includes("already exists")) {
                logger().warn(`Repository creation failed: ${error.message}`);
              } else {
                logger().warn(`GitHub repository creation failed: ${error.message}`);
              }
              logger().info("Falling back to local git repository only.");
              logger().info("To push to a remote repository later:");
              logger().info("1. Create a repository on GitHub/GitLab/Bitbucket");
              logger().info("2. Run: git remote add origin <repository-url>");
              logger().info("3. Run: git push -u origin main");
              logger().info("Or use: sargen gen:git --remote <repository-url>");
              remoteUrl = null;
            }
          } else {
            // GitHub CLI not available, fall back to local-only
            logger().info("No remote repository provided. Initializing local git repository only.");
            logger().info("To push to a remote repository later:");
            logger().info("1. Create a repository on GitHub/GitLab/Bitbucket");
            logger().info("2. Run: git remote add origin <repository-url>");
            logger().info("3. Run: git push -u origin main");
            logger().info("Or use: sargen gen:git --remote <repository-url>");
          }
        }
        
        if (remoteUrl) {
          logger().verbose(`Setting up remote origin: ${remoteUrl}`);
          
          // Add remote origin
          const remoteResult = await cliHelper._runCommand(`git remote add origin ${remoteUrl}`);
          if (!remoteResult.success) {
            if (!this._handleGitErrors(new Error(remoteResult.stderr), "remote")) {
              throw new Error(`Git remote add failed: ${remoteResult.stderr}`);
            }
          } else {
            logger().success("Remote origin added");
          }
          
          // Verify remote configuration
          const remoteVerifyResult = await cliHelper._runCommand("git remote -v");
          if (remoteVerifyResult.success) {
            logger().verbose(`Remote configuration: ${remoteVerifyResult.stdout}`);
          }

          // Detect remote default branch and determine target branch
          const remoteDefaultBranch = await this._getRemoteDefaultBranch(verbose);
          const targetBranch = options.branch || remoteDefaultBranch;
          
          logger().verbose(`Remote default branch: ${remoteDefaultBranch}, Target branch: ${targetBranch}`);
          
          // Create new branch if user specified a different branch name
          if (options.branch && options.branch !== remoteDefaultBranch) {
            logger().verbose(`Creating new branch: ${targetBranch}`);
            const createBranchResult = await cliHelper._runCommand(`git checkout -b ${targetBranch}`);
            if (!createBranchResult.success) {
              logger().warn(`Could not create branch ${targetBranch}: ${createBranchResult.stderr}`);
            } else {
              logger().success(`New branch created: ${targetBranch}`);
            }
          } else {
            // No custom branch specified, use remote default
            logger().success(`Using remote default branch: ${remoteDefaultBranch}`);
          }

          // Push to remote if not disabled
          if (!options.noPush) {
            logger().verbose(`Pushing to remote repository...`);
            
            // Verify the branch exists and has commits before pushing
            const branchCheckResult = await cliHelper._runCommand("git branch --show-current");
            if (!branchCheckResult.success || !branchCheckResult.stdout.trim()) {
              logger().error("No current branch found. Cannot push.");
              return;
            }

            const currentBranch = branchCheckResult.stdout.trim();
            logger().verbose(`Current branch: ${currentBranch}`);

            // Check if branch has commits
            const logResult = await cliHelper._runCommand("git log --oneline -1");
            if (!logResult.success || !logResult.stdout.trim()) {
              logger().error("No commits found on current branch. Cannot push.");
              return;
            }

            logger().verbose(`Latest commit: ${logResult.stdout.trim()}`);
            
            // First, let's check the current branch status
            const branchStatusResult = await cliHelper._runCommand("git branch -a");
            if (branchStatusResult.success) {
              logger().verbose(`Current branches: ${branchStatusResult.stdout}`);
            }
            
            // Ensure we're on the correct branch before pushing
            if (currentBranch !== targetBranch) {
              logger().verbose(`Switching to branch: ${targetBranch}`);
              // First try to checkout existing branch, if it doesn't exist, create it
              const switchResult = await cliHelper._runCommand(`git checkout ${targetBranch}`);
              if (!switchResult.success) {
                // Branch doesn't exist, create it
                logger().verbose(`Creating new branch: ${targetBranch}`);
                const createResult = await cliHelper._runCommand(`git checkout -b ${targetBranch}`);
                if (!createResult.success) {
                  logger().warn(`Could not create branch ${targetBranch}: ${createResult.stderr}`);
                } else {
                  logger().success(`Created and switched to branch: ${targetBranch}`);
                }
              } else {
                logger().success(`Switched to branch: ${targetBranch}`);
              }
            }

            // Try to push to remote repository
            const pushResult = await cliHelper._runCommand(`git push -u origin ${targetBranch}`);
            if (!pushResult.success) {
              logger().error(`Push failed with error: ${pushResult.stderr}`);
              logger().error(`Push stdout: ${pushResult.stdout}`);
              
              // Check if it's an authentication issue
              if (pushResult.stderr.includes("authentication") || pushResult.stderr.includes("permission")) {
                logger().error("Authentication failed. Please check your GitHub credentials.");
                logger().info("You may need to:");
                logger().info("1. Set up a Personal Access Token (PAT)");
                logger().info("2. Configure git credentials");
                logger().info("3. Use SSH instead of HTTPS");
              }
              
              logger().info("You can try pushing manually later with:");
              logger().info(`git push -u origin ${targetBranch}`);
            } else {
              logger().success("Successfully pushed to remote repository");
              logger().info(`Repository is now available at: ${remoteUrl || ""}`);
            }
          } else {
            logger().info("Skipping push to remote (--no-push flag set)");
            logger().info("You can push manually later with:");
            logger().info(`git push -u origin ${targetBranch}`);
          }
        }

        logger().success("Git repository setup completed successfully!");

      } finally {
        // Always restore original working directory
        process.chdir(originalCwd);
      }

    } catch (error) {
      logger().error(`Git setup failed: ${error.message}`);
      throw error;
    }
  },
};

export default gitHelper;
