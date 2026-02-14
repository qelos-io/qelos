import * as readline from 'node:readline';

/**
 * Create an interactive selection with arrow key support
 * @param {Object} options - Selection options
 * @param {Object} options.values - Key-value pairs of option id and label
 * @param {string} [options.defaultValue] - Default option id
 * @param {string} [options.message] - Message to display
 * @returns {Promise<{id: string, value: string}>} Selected option
 */
export async function interactiveSelect({ values, defaultValue, message }) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide cursor for cleaner display
    process.stdout.write('\x1B[?25l');
    
    const options = Object.entries(values);
    let selectedIndex = defaultValue ? options.findIndex(([id]) => id === defaultValue) : 0;
    
    if (message) {
      console.log(message);
    }
    
    const render = () => {
      // Move cursor up to overwrite previous options
      process.stdout.write('\x1B[2K\r');
      for (let i = 0; i < options.length; i++) {
        if (i === 0) {
          process.stdout.write('\x1B[2K\r');
        } else {
          process.stdout.write('\n\x1B[2K\r');
        }
        
        if (i === selectedIndex) {
          process.stdout.write(`(•) ${options[i][1]}`);
        } else {
          process.stdout.write(`( ) ${options[i][1]}`);
        }
      }
      
      // Move cursor back to first option
      if (options.length > 1) {
        process.stdout.write(`\x1B[${options.length - 1}A`);
      }
    };
    
    const cleanup = () => {
      process.stdout.write('\x1B[?25h'); // Show cursor
      rl.close();
    };
    
    render();
    
    // Handle stdin for arrow keys and Enter
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    
    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'up') {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
      } else if (key.name === 'down') {
        selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        console.log(); // Add newline after selection
        resolve({ id: options[selectedIndex][0], value: options[selectedIndex][1] });
      } else if (key.name === 'escape' || key.ctrl && key.name === 'c') {
        cleanup();
        console.log('\nOperation cancelled.');
        process.exit(0);
      }
    });
  });
}

/**
 * Create a yes/no confirmation dialog
 * @param {string} message - Message to display
 * @param {boolean} [defaultValue=false] - Default value
 * @param {Object} [options] - Additional options
 * @param {string} [options.noLabel='No'] - Label for No option
 * @param {string} [options.yesLabel='Yes'] - Label for Yes option
 * @returns {Promise<boolean>} User's choice
 */
export async function confirmDialog(message, defaultValue = false, { noLabel = 'No', yesLabel = 'Yes' } = {}) {
  const result = await interactiveSelect({
    values: {
      no: noLabel,
      yes: yesLabel
    },
    defaultValue: defaultValue ? 'yes' : 'no',
    message
  });
  
  return result.id === 'yes';
}
