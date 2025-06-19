import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useOfficeDataEnhanced } from './hooks/useOfficeDataEnhanced';

/**
 * Test component to verify enhanced office loading functionality
 * This component displays comprehensive statistics about the loaded office data
 */
const OfficeLoadingTest: React.FC = () => {
  const {
    regions,
    divisions,
    offices,
    loading,
    error,
    totalRecords,
    approach,
    refetch
  } = useOfficeDataEnhanced();

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading office data with comprehensive pagination...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This may take a moment as we fetch ALL records from the database
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2">
          Failed to load office data. Please check the console for detailed error information.
        </Typography>
      </Box>
    );
  }

  // Calculate statistics
  const letterDistribution: { [key: string]: number } = {};
  offices.forEach(office => {
    const firstLetter = office.name.charAt(0).toUpperCase();
    letterDistribution[firstLetter] = (letterDistribution[firstLetter] || 0) + 1;
  });

  const sortedOfficeNames = offices.map(o => o.name).sort();
  const tirupurDivision = offices.find(o => o.name.toLowerCase().includes('tirupur division'));
  const coimbatoreDivision = offices.find(o => o.name.toLowerCase().includes('coimbatore division'));

  // Top regions by office count
  const regionCounts = regions.map(region => ({
    name: region.name,
    count: offices.filter(o => o.region === region.name).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // Top divisions by office count
  const divisionCounts = divisions.map(division => ({
    name: division.name,
    count: offices.filter(o => o.division === division.name).length
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Office Loading Test - Enhanced Pagination
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        This test verifies that the enhanced office loading system can fetch ALL records from the Supabase database,
        overcoming the default 1000-record pagination limit.
      </Typography>

      {/* Summary Cards */}
      <Box display="flex" gap={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Total Records
              </Typography>
              <Typography variant="h4">
                {totalRecords.toLocaleString()}
              </Typography>
              <Chip
                label={approach}
                size="small"
                color={totalRecords > 1000 ? "success" : "warning"}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Regions
              </Typography>
              <Typography variant="h4">
                {regions.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Divisions
              </Typography>
              <Typography variant="h4">
                {divisions.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flex="1" minWidth="250px">
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Offices
              </Typography>
              <Typography variant="h4">
                {offices.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Verification Results */}
      <Box display="flex" gap={3} sx={{ flexWrap: 'wrap' }}>
        <Box flex="1" minWidth="400px">
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Verification Results
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Records exceed 1000 limit:
              </Typography>
              <Chip
                label={totalRecords > 1000 ? "✅ YES" : "❌ NO"}
                color={totalRecords > 1000 ? "success" : "error"}
                size="small"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Alphabetical Range:
              </Typography>
              <Typography variant="body2">
                First: "{sortedOfficeNames[0] || 'N/A'}"
              </Typography>
              <Typography variant="body2">
                Last: "{sortedOfficeNames[sortedOfficeNames.length - 1] || 'N/A'}"
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Tirupur Division Found:
              </Typography>
              <Chip
                label={tirupurDivision ? "✅ YES" : "❌ NO"}
                color={tirupurDivision ? "success" : "error"}
                size="small"
              />
              {tirupurDivision && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  "{tirupurDivision.name}"
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Coimbatore Division Found:
              </Typography>
              <Chip
                label={coimbatoreDivision ? "✅ YES" : "❌ NO"}
                color={coimbatoreDivision ? "success" : "error"}
                size="small"
              />
              {coimbatoreDivision && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  "{coimbatoreDivision.name}"
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>

        <Box flex="1" minWidth="400px">
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Letter Distribution
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {Object.keys(letterDistribution).sort().map(letter => (
                <Box key={letter} display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">{letter}:</Typography>
                  <Typography variant="body2">{letterDistribution[letter]} offices</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>

      <Box display="flex" gap={3} sx={{ mt: 3, flexWrap: 'wrap' }}>
        <Box flex="1" minWidth="400px">
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top 5 Regions by Office Count
            </Typography>
            <List dense>
              {regionCounts.map((region, index) => (
                <React.Fragment key={region.name}>
                  <ListItem>
                    <ListItemText
                      primary={region.name}
                      secondary={`${region.count} offices`}
                    />
                  </ListItem>
                  {index < regionCounts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>

        <Box flex="1" minWidth="400px">
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top 10 Divisions by Office Count
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {divisionCounts.map((division, index) => (
                  <React.Fragment key={division.name}>
                    <ListItem>
                      <ListItemText
                        primary={division.name}
                        secondary={`${division.count} offices`}
                      />
                    </ListItem>
                    {index < divisionCounts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Success Message */}
      {totalRecords > 1000 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="h6">
            🎉 Success! Enhanced Office Loading is Working
          </Typography>
          <Typography variant="body2">
            The system successfully loaded {totalRecords.toLocaleString()} office records, 
            which exceeds the default 1000-record Supabase limit. This confirms that the 
            comprehensive pagination solution is working correctly.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default OfficeLoadingTest;
