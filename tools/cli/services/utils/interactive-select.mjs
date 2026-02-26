import * as readline from 'node:readline';

/**
 * Create an interactive selection with arrow key support
 * @param {Object} options - Selection options
 * @param {Object} options.values - Key-value pairs of option id and label
 * @param {string} [options.defaultValue] - Default option id
 * @param {string} [options.message] - Message to display
 * @param {string} [options.title] - Title to display above the selection
 * @param {number} [options.pageSize=10] - Number of items to show at once
 * @returns {Promise<{id: string, value: string}>} Selected option
 */
export async function interactiveSelect({ values, defaultValue, message, title, pageSize = 10, timeout = 30000 }) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide cursor for cleaner display
    process.stdout.write('\x1B[?25l');
    
    const options = Object.entries(values);
    let selectedIndex = defaultValue ? options.findIndex(([id]) => id === defaultValue) : 0;
    let startIndex = 0;
    let timeoutId;
    
    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        console.log('\n\x1b[90mOperation timed out.\x1b[0m');
        process.exit(1);
      }, timeout);
    }
    
    // Clear screen and show header
    const clearAndShowHeader = () => {
      console.clear();
      if (title) {
        console.log(`\x1b[1m${title}\x1b[0m`);
        console.log('\x1b[90m' + '─'.repeat(title.length) + '\x1b[0m\n');
      }
      if (message) {
        console.log(`${message}\n`);
      }
      console.log('\x1b[90mUse ↑↓ arrows to navigate, Enter to select, Esc to cancel\x1b[0m\n');
    };
    
    const render = () => {
      // Calculate visible items
      const endIndex = Math.min(startIndex + pageSize, options.length);
      const visibleOptions = options.slice(startIndex, endIndex);
      
      // Show visible options
      visibleOptions.forEach(([id, label], index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === selectedIndex;
        
        // Create indicator with current position
        const position = actualIndex + 1;
        const indicator = isSelected ? '\x1b[36m►\x1b[0m' : ' ';
        
        // Highlight selected item
        if (isSelected) {
          console.log(`\x1b[36m${indicator} ${position}. \x1b[1m${label}\x1b[0m`);
        } else {
          console.log(`${indicator} ${position}. ${label}`);
        }
      });
      
      // Show pagination info if needed
      if (options.length > pageSize) {
        const totalPages = Math.ceil(options.length / pageSize);
        const currentPage = Math.floor(startIndex / pageSize) + 1;
        console.log(`\n\x1b[90mPage ${currentPage} of ${totalPages} (${options.length} items)\x1b[0m`);
      }
      
      // Move cursor up to redraw
      const totalLines = visibleOptions.length + (options.length > pageSize ? 2 : 1);
      process.stdout.write(`\x1b[${totalLines}A`);
    };
    
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      process.stdout.write('\x1B[?25h'); // Show cursor
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeAllListeners('keypress');
      process.stdin.pause();
      rl.close();
    };
    
    const updateScroll = () => {
      if (selectedIndex < startIndex) {
        startIndex = selectedIndex;
      } else if (selectedIndex >= startIndex + pageSize) {
        startIndex = selectedIndex - pageSize + 1;
      }
    };
    
    clearAndShowHeader();
    render();
    
    // Handle stdin for arrow keys and Enter
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    
    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'up') {
        selectedIndex = Math.max(0, selectedIndex - 1);
        updateScroll();
        clearAndShowHeader();
        render();
      } else if (key.name === 'down') {
        selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
        updateScroll();
        clearAndShowHeader();
        render();
      } else if (key.name === 'pageup') {
        selectedIndex = Math.max(0, selectedIndex - pageSize);
        updateScroll();
        clearAndShowHeader();
        render();
      } else if (key.name === 'pagedown') {
        selectedIndex = Math.min(options.length - 1, selectedIndex + pageSize);
        updateScroll();
        clearAndShowHeader();
        render();
      } else if (key.name === 'home') {
        selectedIndex = 0;
        startIndex = 0;
        clearAndShowHeader();
        render();
      } else if (key.name === 'end') {
        selectedIndex = options.length - 1;
        startIndex = Math.max(0, options.length - pageSize);
        clearAndShowHeader();
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        console.clear();
        console.log(`\x1b[36m✓\x1b[0m Selected: \x1b[1m${options[selectedIndex][1]}\x1b[0m`);
        resolve({ id: options[selectedIndex][0], value: options[selectedIndex][1] });
      } else if (key.name === 'escape' || key.ctrl && key.name === 'c') {
        cleanup();
        console.log('\n\x1b[90mOperation cancelled.\x1b[0m');
        process.exit(0);
      } else if (key.sequence >= '1' && key.sequence <= '9') {
        // Number shortcuts
        const num = parseInt(key.sequence) - 1;
        if (num < options.length) {
          selectedIndex = num;
          updateScroll();
          clearAndShowHeader();
          render();
        }
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
