export function assertStrictEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Assertion failed: "${actual}" !== "${expected}"`);
    }
}

export function test(description, fn) {
    return new Promise(resolve => {
        try {
            fn();
            resolve({ success: true, description });
        } catch (error) {
            console.error(`Test failed: ${description}`, error);
            resolve({ success: false, description, error: error.message });
        }
    });
}

export async function loadAndRunTests() {
    const testFiles = Array.from(document.querySelectorAll('script[data-test-file]'))
        .map(script => script.getAttribute('data-test-file'))
        .filter(file => file && file.trim() !== ''); // Filter out empty or invalid file paths

    if (testFiles.length === 0) {
        console.warn('No valid test files found. Ensure data-test-file attributes are correctly set.');
        return;
    }

    for (const file of testFiles) {
        try {
            const module = await import(file);
            const heading = document.createElement('h2');
            heading.textContent = `Results for ${file}`;
            document.body.appendChild(heading);

            const resultsContainer = document.createElement('div');
            resultsContainer.style.fontFamily = 'Arial, sans-serif';
            resultsContainer.style.margin = '20px';
            document.body.appendChild(resultsContainer);

            if (module.runTests) {
                const testPromises = module.runTests({ test, assertStrictEqual });
                const results = await Promise.all(testPromises);

                results.forEach(result => {
                    const resultElement = document.createElement('div');
                    if (result.success) {
                        resultElement.style.color = 'green';
                        resultElement.textContent = `✔ ${result.description}`;
                    } else {
                        resultElement.style.color = 'red';
                        resultElement.textContent = `✘ ${result.description}: ${result.error}`;
                    }
                    resultsContainer.appendChild(resultElement);
                });
            } else {
                const error = document.createElement('div');
                error.style.color = 'red';
                error.textContent = `No runTests function found in ${file}`;
                resultsContainer.appendChild(error);
            }
        } catch (error) {
            console.error(`Failed to load test file: ${file}`, error);
            const errorElement = document.createElement('div');
            errorElement.style.color = 'red';
            errorElement.textContent = `Failed to load test file: ${file}`;
            document.body.appendChild(errorElement);
        }
    }
}

// Automatically run tests on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Running all tests...');
    loadAndRunTests();
});
