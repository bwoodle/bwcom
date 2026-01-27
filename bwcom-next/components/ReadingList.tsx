import React from 'react';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';

const ReadingList: React.FC = () => {
  return (
    <Container header={<Header variant="h1">Reading List</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <p>Manage your reading list here.</p>
        {/* Add reading list functionality */}
      </SpaceBetween>
    </Container>
  );
};

export default ReadingList;