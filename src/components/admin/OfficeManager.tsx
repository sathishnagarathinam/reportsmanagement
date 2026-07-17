import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

import {
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';

export interface Office {
  id: string;
  officeName: string;
  region?: string;
  division?: string;
  reportingOfficeName?: string;
  createdAt?: string;
  updatedAt?: string;
}

const OfficeManager: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);

  const [formData, setFormData] = useState({
    officeName: '',
    region: '',
    division: '',
    reportingOfficeName: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    setLoading(true);
    setError('');

    try {
      const officesRef = collection(db, 'offices');
      const snapshot = await getDocs(query(officesRef));

      const officesData: Office[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        officesData.push({
          id: docSnap.id,
          officeName: data.officeName || '',
          region: data.region || '',
          division: data.division || '',
          reportingOfficeName: data.reportingOfficeName || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      officesData.sort((a, b) => {
        const regionCompare = (a.region || '').localeCompare(b.region || '');
        if (regionCompare !== 0) return regionCompare;

        const divisionCompare = (a.division || '').localeCompare(b.division || '');
        if (divisionCompare !== 0) return divisionCompare;

        return (a.officeName || '').localeCompare(b.officeName || '');
      });

      setOffices(officesData);
    } catch (err) {
      console.error('Error fetching offices:', err);
      setError('Failed to load offices. Please check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOffices = offices.filter(
    (office) =>
      office.officeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (office.region && office.region.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (office.division && office.division.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setSelectedOffice(null);
    setFormData({
      officeName: '',
      region: '',
      division: '',
      reportingOfficeName: '',
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (office: Office) => {
    setDialogMode('edit');
    setSelectedOffice(office);
    setFormData({
      officeName: office.officeName,
      region: office.region || '',
      division: office.division || '',
      reportingOfficeName: office.reportingOfficeName || '',
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOffice(null);
    setFormError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.officeName.trim()) {
      setFormError('Office name is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setFormError('');

    try {
      const timestamp = new Date().toISOString();

      if (dialogMode === 'create') {
        const docId = formData.officeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

        const existingDoc = await getDoc(doc(db, 'offices', docId));
        if (existingDoc.exists()) {
          setFormError('An office with this name already exists');
          setSaving(false);
          return;
        }

        await setDoc(doc(db, 'offices', docId), {
          ...formData,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (dialogMode === 'edit' && selectedOffice) {
        await updateDoc(doc(db, 'offices', selectedOffice.id), {
          ...formData,
          updatedAt: timestamp,
        });
      }

      await fetchOffices();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving office:', err);
      setFormError('Failed to save office. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (office: Office) => {
    if (!window.confirm(`Are you sure you want to delete office "${office.officeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'offices', office.id));
      await fetchOffices();
    } catch (err) {
      console.error('Error deleting office:', err);
      alert('Failed to delete office. Please try again.');
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Office Management
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<span aria-hidden="true">+</span>}
              onClick={handleOpenCreateDialog}
            >
              Add New Office
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Manage office locations, regions, and divisions. Total offices: {offices.length}
          </Typography>

          <TextField
            fullWidth
            label="Search offices by name, region, or division"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Office Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Region</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Division</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reporting Office</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '140px' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOffices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No offices found. Click "Add New Office" to create one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOffices.map((office) => (
                      <TableRow key={office.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{office.officeName}</TableCell>
                        <TableCell>{office.region || '-'}</TableCell>
                        <TableCell>{office.division || '-'}</TableCell>
                        <TableCell>{office.reportingOfficeName || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditDialog(office)}
                              title="Edit Office"
                            >
                              <span aria-hidden="true">Edit</span>
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(office)}
                              title="Delete Office"
                            >
                              <span aria-hidden="true">Delete</span>
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'create' ? 'Add New Office' : 'Edit Office'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="officeName"
                label="Office Name *"
                fullWidth
                value={formData.officeName}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="region"
                label="Region"
                fullWidth
                value={formData.region}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="division"
                label="Division"
                fullWidth
                value={formData.division}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="reportingOfficeName"
                label="Reporting Office Name"
                fullWidth
                value={formData.reportingOfficeName}
                onChange={handleInputChange}
                helperText="The office that this office reports to (if any)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficeManager;

