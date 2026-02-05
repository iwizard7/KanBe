const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const boardModel = require('../models/board.model');

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

class BackupService {
    createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(BACKUP_DIR, `board-backup-${timestamp}.json`);

            // Copy the current board file
            fs.copyFileSync(boardModel.getFilePath(), backupPath);
            logger.info(`Backup created: ${backupPath}`);

            this.cleanOldBackups();
        } catch (error) {
            logger.error('Backup creation failed', { error: error.message });
        }
    }

    cleanOldBackups() {
        try {
            const keepDays = parseInt(process.env.BACKUP_DAYS) || 7;
            const now = Date.now();
            let deletedCount = 0;

            const files = fs.readdirSync(BACKUP_DIR);

            files.forEach(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

                if (ageInDays > keepDays) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old backups`);
            }
        } catch (error) {
            logger.error('Old backup cleanup failed', { error: error.message });
        }
    }
}

module.exports = new BackupService();
