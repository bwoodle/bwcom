import React from 'react';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';

const Media: React.FC = () => {
  return (
    <Container header={<Header variant="h1">Media</Header>}>
      <SpaceBetween direction="vertical" size="m">
        <p>This page lists media I liked in reverse chronological order — newest first.</p>

        <section>
          <Header variant="h2">Books</Header>
          <ul>
            <li>The Getaway — my most recent read. A fast-paced thriller I finished recently.</li>
            <li>Example Book Title (2024)</li>
            <li>Another Favorite (2023) — short note about why I liked it.</li>
          </ul>
        </section>

        <section>
          <Header variant="h2">Movies</Header>
          <ul>
            <li>Example Movie Title (2025)</li>
            <li>Another Movie — brief comment about a standout scene.</li>
          </ul>
        </section>

        <section>
          <Header variant="h2">TV</Header>
          <ul>
            <li>Example Series — season 3 (2024)</li>
            <li>Another Series</li>
          </ul>
        </section>

        <p>I will add comments for some items and sometimes only list the title.</p>
      </SpaceBetween>
    </Container>
  );
};

export default Media;