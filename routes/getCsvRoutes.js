import express from 'express';
import csv from 'fast-csv';
import xlsx from 'xlsx';
import { authenticate, authorizeRoles } from '../middleware/authMiddleWare.js';
import { User, Batch } from '../db/db.js';

const getExportRoute = express.Router();

// Export users
getExportRoute.get('/users', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
    try {
        const { format, batch, role, status } = req.query;
        
        let query = {};
        
        // Apply filters
        if (role && role !== 'All') {
            query.role = role;
        }
        
        if (status && status !== 'All') {
            query.status = status;
        }
        
        let users = await User.find(query).populate('batches');
      
        if (batch && batch !== 'All') {
          const batchObj = await Batch.findOne({ name: batch });
          if (batchObj) {
            users = users.filter(user => 
              user.batches.some(b => b._id.toString() === batchObj._id.toString())
            );
          }
        }
        
        // Format data for export
        const exportData = users.map(user => ({
          Name: user.name,
          Email: user.email,
          Role: user.role,
          Batches: user.batches.map(b => b.name).join(', '),
          JoinDate: user.joinDate.toISOString().split('T')[0],
          Status: user.status
        }));

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
            
            const csvStream = csv.format({ headers: true });
            csvStream.pipe(res);
            exportData.forEach(user => csvStream.write(user));
            csvStream.end();
        } else if (format === 'xlsx') {
            const worksheet = xlsx.utils.json_to_sheet(exportData);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
            
            const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
            res.send(buffer);
        } else {
            res.status(400).json({ message: 'Unsupported format' });
        }
    } catch (error) {
        console.error('Error exporting users:', error);
        res.status(500).json({ message: 'Failed to export users' });
    }
});

export default getExportRoute;
