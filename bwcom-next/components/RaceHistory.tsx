import React from 'react';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';

const RaceHistory: React.FC = () => {
  return (
    <Container header={<Header variant="h1">Race History</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <p>View your race history here.</p>
        {/* Add race history functionality */}
      </SpaceBetween>
    </Container>
  );
};

export default RaceHistory;