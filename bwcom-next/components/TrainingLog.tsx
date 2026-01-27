import React from 'react';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';

const TrainingLog: React.FC = () => {
  return (
    <Container header={<Header variant="h1">Training Log</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <p>Log your training sessions here.</p>
        {/* Add training log functionality */}
      </SpaceBetween>
    </Container>
  );
};

export default TrainingLog;