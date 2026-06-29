import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import FirebaseVersionService, { VersionControlData, PlatformVersionControl } from '../../services/firebaseVersionService';

const VersionControl: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [androidData, setAndroidData] = useState<VersionControlData>({
    latest_version: '',
    min_required_version: '',
    force_update: false,
    release_notes: '',
    url: '',
  });

  const [iosData, setIosData] = useState<VersionControlData>({
    latest_version: '',
    min_required_version: '',
    force_update: false,
    release_notes: '',
    url: '',
  });

  useEffect(() => {
    fetchVersionData();
  }, []);

  const fetchVersionData = async () => {
    try {
      setLoading(true);
      const allData = await FirebaseVersionService.getAllVersionControl();
      if (allData) {
        setAndroidData(allData.android);
        setIosData(allData.ios);
      }
    } catch (error) {
      console.error('Error fetching version data:', error);
      setMessage({ type: 'error', text: 'Failed to load version data' });
    } finally {
      setLoading(false);
    }
  };

  const validateVersionString = (version: string): boolean => {
    return FirebaseVersionService.isValidVersion(version);
  };

  const handleAndroidChange = (field: keyof VersionControlData, value: any) => {
    setAndroidData(prev => ({ ...prev, [field]: value }));
  };

  const handleIosChange = (field: keyof VersionControlData, value: any) => {
    setIosData(prev => ({ ...prev, [field]: value }));
  };

  const validateData = (): boolean => {
    if (!validateVersionString(androidData.latest_version)) {
      setMessage({ type: 'error', text: 'Invalid Android latest version format' });
      return false;
    }
    if (!validateVersionString(androidData.min_required_version)) {
      setMessage({ type: 'error', text: 'Invalid Android minimum version format' });
      return false;
    }
    if (!validateVersionString(iosData.latest_version)) {
      setMessage({ type: 'error', text: 'Invalid iOS latest version format' });
      return false;
    }
    if (!validateVersionString(iosData.min_required_version)) {
      setMessage({ type: 'error', text: 'Invalid iOS minimum version format' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    try {
      if (!validateData()) return;

      setSaving(true);
      const success = await FirebaseVersionService.updateAllVersions({
        android: androidData,
        ios: iosData,
      });

      if (success) {
        setMessage({ type: 'success', text: 'Version control updated successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save version control data' });
      }
    } catch (error) {
      console.error('Error saving version data:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading version control data...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="📱 Version Control Management"
        subheader="Manage app versions for iOS and Android"
      />
      <Divider />
      <CardContent>
        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          {/* Android Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              🤖 Android
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Latest Version"
                placeholder="e.g., 1.0.1"
                value={androidData.latest_version}
                onChange={(e) => handleAndroidChange('latest_version', e.target.value)}
                helperText="Format: X.Y.Z"
                fullWidth
              />
              <TextField
                label="Minimum Required Version"
                placeholder="e.g., 1.0.0"
                value={androidData.min_required_version}
                onChange={(e) => handleAndroidChange('min_required_version', e.target.value)}
                helperText="Users below this version will get force update"
                fullWidth
              />
              <TextField
                label="Google Play Store URL"
                placeholder="https://play.google.com/store/apps/details?id=..."
                value={androidData.url}
                onChange={(e) => handleAndroidChange('url', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Release Notes"
                placeholder="What's new in this version?"
                value={androidData.release_notes}
                onChange={(e) => handleAndroidChange('release_notes', e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={androidData.force_update}
                    onChange={(e) => handleAndroidChange('force_update', e.target.checked)}
                  />
                }
                label="Force Update (non-dismissible for users below min version)"
              />
            </Box>
          </Box>

          {/* iOS Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              🍎 iOS
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Latest Version"
                placeholder="e.g., 1.0.1"
                value={iosData.latest_version}
                onChange={(e) => handleIosChange('latest_version', e.target.value)}
                helperText="Format: X.Y.Z"
                fullWidth
              />
              <TextField
                label="Minimum Required Version"
                placeholder="e.g., 1.0.0"
                value={iosData.min_required_version}
                onChange={(e) => handleIosChange('min_required_version', e.target.value)}
                helperText="Users below this version will get force update"
                fullWidth
              />
              <TextField
                label="App Store URL"
                placeholder="https://apps.apple.com/..."
                value={iosData.url}
                onChange={(e) => handleIosChange('url', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Release Notes"
                placeholder="What's new in this version?"
                value={iosData.release_notes}
                onChange={(e) => handleIosChange('release_notes', e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={iosData.force_update}
                    onChange={(e) => handleIosChange('force_update', e.target.checked)}
                  />
                }
                label="Force Update (non-dismissible for users below min version)"
              />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={fetchVersionData} disabled={saving}>
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VersionControl;
