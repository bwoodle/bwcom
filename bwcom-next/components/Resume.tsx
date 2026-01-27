import React from 'react';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';

const Resume: React.FC = () => {
  return (
    <Container header={<Header variant="h1">Resume</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <p>Your resume details here.</p>
        {/* Add resume functionality */}
      </SpaceBetween>
    </Container>
  );
};

export default Resume;