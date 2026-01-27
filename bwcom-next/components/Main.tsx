import React from 'react';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';

const Main: React.FC = () => {
  return (
    <Container header={<Header variant="h1">Welcome to BWCom</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <p>This is the main page.</p>
        <p>Navigate to other sections using the menu.</p>
      </SpaceBetween>
    </Container>
  );
};

export default Main;