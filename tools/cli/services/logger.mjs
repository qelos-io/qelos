/**
 * Logger utility for CLI with colored output and consistent formatting
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

export const logger = {
  success(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  },

  error(message, error = null) {
    console.error(`${colors.red}✗ Error:${colors.reset} ${message}`);
    if (error && process.env.VERBOSE) {
      console.error(`${colors.gray}${error.stack || error}${colors.reset}`);
    }
  },

  warning(message) {
    console.warn(`${colors.yellow}⚠ Warning:${colors.reset} ${message}`);
  },

  info(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
  },

  debug(message) {
    if (process.env.VERBOSE) {
      console.log(`${colors.gray}[DEBUG]${colors.reset} ${message}`);
    }
  },

  step(message) {
    console.log(`${colors.cyan}→${colors.reset} ${message}`);
  },

  section(title) {
    console.log(`\n${colors.bright}${title}${colors.reset}`);
  },

  /**
   * Format and display a connection error with helpful context
   */
  connectionError(url, error) {
    console.error(`\n${colors.red}✗ Connection Failed${colors.reset}`);
    console.error(`${colors.dim}Unable to connect to: ${colors.reset}${url}`);
    
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error(`${colors.yellow}Reason:${colors.reset} Connection timeout (10s)`);
      console.error(`\n${colors.cyan}Suggestions:${colors.reset}`);
      console.error(`  • Check if the server is running and accessible`);
      console.error(`  • Verify the QELOS_URL is correct: ${url}`);
      console.error(`  • Check your network connection`);
      console.error(`  • Ensure there are no firewall rules blocking the connection`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`${colors.yellow}Reason:${colors.reset} Domain not found`);
      console.error(`\n${colors.cyan}Suggestions:${colors.reset}`);
      console.error(`  • Verify the QELOS_URL is correct: ${url}`);
      console.error(`  • Check if the domain exists and is accessible`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`${colors.yellow}Reason:${colors.reset} Connection refused`);
      console.error(`\n${colors.cyan}Suggestions:${colors.reset}`);
      console.error(`  • Check if the server is running on ${url}`);
      console.error(`  • Verify the port number is correct`);
    } else {
      console.error(`${colors.yellow}Reason:${colors.reset} ${error.message}`);
    }

    if (process.env.VERBOSE) {
      console.error(`\n${colors.gray}Full error:${colors.reset}`);
      console.error(`${colors.gray}${error.stack}${colors.reset}`);
    } else {
      console.error(`\n${colors.dim}Run with VERBOSE=true for more details${colors.reset}`);
    }
  },

  /**
   * Format and display an authentication error
   */
  authError(username, url) {
    console.error(`\n${colors.red}✗ Authentication Failed${colors.reset}`);
    console.error(`${colors.dim}Unable to authenticate user: ${colors.reset}${username}`);
    console.error(`${colors.dim}Server: ${colors.reset}${url}`);
    console.error(`\n${colors.cyan}Suggestions:${colors.reset}`);
    console.error(`  • Verify QELOS_USERNAME is correct: ${username}`);
    console.error(`  • Check if QELOS_PASSWORD is correct`);
    console.error(`  • Ensure the user account exists and is active`);
    console.error(`  • Verify you have the necessary permissions`);
  },

  /**
   * Display environment configuration
   */
  showConfig(config) {
    console.log(`\n${colors.bright}Configuration:${colors.reset}`);
    Object.entries(config).forEach(([key, value]) => {
      const displayValue = key.toLowerCase().includes('password') ? '***' : value;
      console.log(`  ${colors.cyan}${key}:${colors.reset} ${displayValue}`);
    });
    console.log('');
  }
};
