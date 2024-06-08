const WebSocket = require('ws');
const { spawn } = require('child_process');
const { results } = require('@permaweb/aoconnect');
const { readFileSync } = require('fs');
const { sendMessageToAOTerminal } = require('./send');

const walletPath = '/root/.aos.json';
const walletContent = JSON.parse(readFileSync(walletPath).toString());

const processID = '90O7RFBp7M2c9TkOot4Nb5r-rbN9QMUAmcxu0Hf3K6Q';
const dockerComposeDir = '/root/quickstart-archaeologist'; // Docker Compose dosyasýnýn bulunduðu dizin

const wss = new WebSocket.Server({ port: 5000 });
let processing = false;
let wsConnection = null;

wss.on('connection', (ws) => {
    console.log('WebSocket connection established');
    wsConnection = ws; // Store WebSocket connection globally

    ws.on('message', async (message) => {
        console.log('Received message:', message);

        let data;
        try {
            data = JSON.parse(message);
            console.log('Message parsed as JSON:', data);
        } catch (e) {
            console.error('Message parsing error:', e);
            return;
        }

        // Print received data
        console.log('Element Data:', data);

        // Extract and print amount
        if (data.Data && data.Data.amount && !processing) {
            const amount = data.Data.amount;
            console.log(`Amount to be bonded: ${amount} received.`);
            processing = true; // Mark as processing

            // Execute bond command
            const dockerCommand = spawn('sh', ['-c', `echo "y" | docker-compose exec -T archaeologist sh -c 'cli update -f ${amount} --network sepolia'`], {
                cwd: dockerComposeDir
            });

            dockerCommand.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            dockerCommand.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            dockerCommand.on('error', (error) => {
                console.error(`Command execution error: ${error.message}`);
            });

            dockerCommand.on('close', async (code) => {
                console.log(`Command exit code: ${code}`);
                const resultMessage = code === 0 ? 
                    `Bonding process successful! Amount: ${amount}` : 
                    `Bonding process failed, exit code: ${code}`;

                console.log(resultMessage);

                // Send result to AO Terminal
                await sendMessageToAOTerminal('BondingProcessResult', resultMessage);

                processing = false; // Reset processing flag
                AOTerminalChecking(); // Restart the checking process after completion
            });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        wsConnection = null; // Reset global WebSocket connection
    });
});

console.log('WebSocket server started on port 5000');

let cursor = '';

async function AOTerminalChecking() {
    if (processing) {
        console.log('Currently processing another request. Skipping this check.');
        setTimeout(AOTerminalChecking, 5000); // Retry after delay
        return;
    }

    try {
        if (cursor === '') {
            const resultsOut = await results({
                process: processID,
                sort: 'DESC',
                limit: 1,
            });
            if (resultsOut.edges.length > 0) {
                cursor = resultsOut.edges[0].cursor;
                console.log('Initial results:', resultsOut);
            } else {
                console.log('No results found.');
                return;
            }
        }

        console.log('AOTerminalChecking------>>>>');
        const resultsOut2 = await results({
            process: processID,
            from: cursor,
            sort: 'ASC',
            limit: 50,
        });

        for (const element of resultsOut2.edges.reverse()) {
            cursor = element.cursor;
            console.log('Element Data:', element.node.Messages);

            for (const msg of element.node.Messages) {
                console.log('Message Tags:', msg.Tags);
            }

            for (const messagesItem of element.node.Messages) {
                const event = messagesItem.Tags.find(e => e.name === 'Event')?.value || 'Message in AOTerminal';
                const sendTest = event + ' : ' + messagesItem.Data;
                console.log('Captured Message:', sendTest);

                // Extract and print amount
                const messageData = JSON.parse(messagesItem.Data);
                if (messageData.amount && !processing) {
                    const amount = messageData.amount;
                    console.log(`Amount to be bonded: ${amount} received.`);
                    processing = true; // Mark as processing

                    // Execute bond command
                    const dockerCommand = spawn('sh', ['-c', `echo "y" | docker-compose exec -T archaeologist sh -c 'cli update -f ${amount} --network sepolia'`], {
                        cwd: dockerComposeDir
                    });

                    dockerCommand.stdout.on('data', (data) => {
                        console.log(`stdout: ${data}`);
                    });

                    dockerCommand.stderr.on('data', (data) => {
                        console.error(`stderr: ${data}`);
                    });

                    dockerCommand.on('error', (error) => {
                        console.error(`Command execution error: ${error.message}`);
                    });

                    dockerCommand.on('close', async (code) => {
                        console.log(`Command exit code: ${code}`);
                        const resultMessage = code === 0 ? 
                            `Bonding process successful! Amount: ${amount}` : 
                            `Bonding process failed, exit code: ${code}`;

                        console.log(resultMessage);

                        // Send result to AO Terminal
                        await sendMessageToAOTerminal('BondingProcessResult', resultMessage);

                        processing = false; // Reset processing flag
                        AOTerminalChecking(); // Restart the checking process after completion
                    });
                }
            }
        }
    } catch (error) {
        console.error('AOTerminalChecking error:', error);
        console.error('Error details:', error.message);
    } finally {
        if (!processing) {
            setTimeout(AOTerminalChecking, 5000); // Continue checking if not processing
        }
    }
}

AOTerminalChecking();
