'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Spinner,
  StatusIndicator,
  Grid,
  Table,
} from '@cloudscape-design/components';

interface AllowanceItem {
  date: string;
  description: string;
  amount: number;
}

interface ChildAllowance {
  childName: string;
  total: number;
  recentItems: AllowanceItem[];
}

const formatCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const formatted = abs.toFixed(2);
  return amount >= 0 ? `+$${formatted}` : `-$${formatted}`;
};

const ChildAllowanceCard: React.FC<{ data: ChildAllowance }> = ({ data }) => {
  return (
    <Container
      header={
        <Header
          variant="h2"
          description={
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: data.total >= 0 ? '#0d6b1e' : '#d13212',
              }}
            >
              Balance: ${data.total.toFixed(2)}
            </span>
          }
        >
          {data.childName}
        </Header>
      }
    >
      <Table
        variant="embedded"
        columnDefinitions={[
          {
            id: 'date',
            header: 'Date',
            cell: (item: AllowanceItem) => item.date,
            width: 130,
          },
          {
            id: 'description',
            header: 'Description',
            cell: (item: AllowanceItem) => item.description,
          },
          {
            id: 'amount',
            header: 'Amount',
            cell: (item: AllowanceItem) => (
              <span
                style={{
                  color: item.amount >= 0 ? '#0d6b1e' : '#d13212',
                  fontWeight: 600,
                }}
              >
                {formatCurrency(item.amount)}
              </span>
            ),
            width: 110,
          },
        ]}
        items={data.recentItems}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="s">
            No allowance activity yet.
          </Box>
        }
      />
    </Container>
  );
};

const Allowance: React.FC = () => {
  const [children, setChildren] = useState<ChildAllowance[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllowance() {
      try {
        const res = await fetch('/api/allowance');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setChildren(data.children);
        setStatus('loaded');
      } catch (err) {
        console.error('Failed to load allowance data:', err);
        setErrorMsg('Failed to load allowance data.');
        setStatus('error');
      }
    }
    fetchAllowance();
  }, []);

  if (status === 'loading') {
    return (
      <Container header={<Header variant="h1">Allowance</Header>}>
        <Box textAlign="center" padding={{ vertical: 'l' }}>
          <Spinner size="large" />
          <Box variant="p" margin={{ top: 's' }}>
            Loading allowance data...
          </Box>
        </Box>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container header={<Header variant="h1">Allowance</Header>}>
        <StatusIndicator type="error">{errorMsg}</StatusIndicator>
      </Container>
    );
  }

  return (
    <SpaceBetween size="m">
      <Header variant="h1">Allowance</Header>
      <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
        {children.map((child) => (
          <ChildAllowanceCard key={child.childName} data={child} />
        ))}
      </Grid>
    </SpaceBetween>
  );
};

export default Allowance;
