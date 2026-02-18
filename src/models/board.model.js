const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.join(process.cwd(), 'data');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Initialize board file if not exists
if (!fs.existsSync(BOARD_FILE)) {
    const defaultBoard = {
        projects: [],
        columns: [
            { id: '1', title: 'To Do', tasks: [] },
            { id: '2', title: 'In Progress', tasks: [] },
            { id: '3', title: 'Done', tasks: [] }
        ]
    };
    fs.writeFileSync(BOARD_FILE, JSON.stringify(defaultBoard, null, 2));
    logger.info('Created new board.json with default structure');
}

class BoardModel {
    read() {
        try {
            const data = fs.readFileSync(BOARD_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading board file', { error: error.message });
            throw new Error('Failed to read board data');
        }
    }

    save(board) {
        try {
            fs.writeFileSync(BOARD_FILE, JSON.stringify(board, null, 2));
        } catch (error) {
            logger.error('Error saving board file', { error: error.message });
            throw new Error('Failed to save board data');
        }
    }

    getFilePath() {
        return BOARD_FILE;
    }
}

module.exports = new BoardModel();
