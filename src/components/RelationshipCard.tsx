/**
 * 関係性カードコンポーネント
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  getCustomerRelationships,
  getConfidenceColor,
  RelatedCustomer,
} from '../api/relationships';

interface RelationshipCardProps {
  customerId: string;
}

export function RelationshipCard({ customerId }: RelationshipCardProps) {
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState<RelatedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelationships = async () => {
      if (!customerId) return;

      setLoading(true);
      setError(null);

      try {
        const result = await getCustomerRelationships(customerId);
        setRelationships(result);
      } catch (err) {
        console.error('Error fetching relationships:', err);
        setError('関係性データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [customerId]);

  const handleCustomerClick = (trackingNo: string) => {
    navigate(`/customers/${trackingNo}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            関係性
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            関係性
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6">
            関係性
          </Typography>
          <Chip
            label={`${relationships.length}件`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Divider sx={{ mb: 2 }} />

        {relationships.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            関係性が登録されていません
          </Typography>
        ) : (
          <List disablePadding>
            {relationships.map((item, index) => (
              <ListItem
                key={item.relationship.id}
                disablePadding
                divider={index < relationships.length - 1}
              >
                <ListItemButton
                  onClick={() => handleCustomerClick(item.customer.trackingNo)}
                  sx={{ py: 1.5 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                    <PersonIcon color="action" fontSize="small" />
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {item.customer.name}
                        </Typography>
                        <Chip
                          label={item.relationship.relationshipName}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                        {item.relationship.needsManualResolution && (
                          <Tooltip title="確認が必要です">
                            <WarningIcon color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          管理番号: {item.customer.trackingNo}
                        </Typography>
                        {item.customer.phone && (
                          <Typography variant="caption" color="text.secondary">
                            TEL: {item.customer.phone}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={`${Math.round(item.relationship.confidence * 100)}%`}
                      size="small"
                      color={getConfidenceColor(item.relationship.confidence)}
                      sx={{ minWidth: 50 }}
                    />
                  </ListItemSecondaryAction>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
