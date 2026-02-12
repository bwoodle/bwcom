'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Container, Header, Modal, SpaceBetween } from '@cloudscape-design/components';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL ?? '';

const photos = [
  {
    id: '1',
    alt: 'Preston',
    thumbSrc: `${IMAGES_BASE_URL}/web-content/thumbs/1.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/web-content/1.jpg`,
  },
  {
    id: '2',
    alt: 'Natalie',
    thumbSrc: `${IMAGES_BASE_URL}/web-content/thumbs/2.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/web-content/2.jpg`,
  },
  {
    id: '3',
    alt: 'Family',
    thumbSrc: `${IMAGES_BASE_URL}/web-content/thumbs/3.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/web-content/3.jpg`,
  },
  {
    id: '4',
    alt: 'Leighton',
    thumbSrc: `${IMAGES_BASE_URL}/web-content/thumbs/4.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/web-content/4.jpg`,
  },
];

const AboutMe: React.FC = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<(typeof photos)[number] | null>(null);

  return (
    <Container>
      <SpaceBetween direction="vertical" size="m">
        <section>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 'clamp(0.25rem, 1vw, 1rem)',
            }}
          >
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                style={{
                  border: 'none',
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    borderRadius: '8px',
                  }}
                >
                  <Image
                    src={photo.thumbSrc}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 768px) 25vw, 100vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <SpaceBetween direction="vertical" size="s">
            <Header variant="h2">About Me</Header>
            <p>
              I grew up in Omaha, Nebraska, and earned my degree in Computer Science with a minor in Mathematics from the University of Nebraska at Omaha. Shortly after college, I headed south to Dallas, which has been home for the past 17 years and counting.
            </p>
            <p>
              I met my wife, Natalie, the most on-brand way possible: at a running club (TNSR). We had a Schnauzer (Gilbert), purchased our first home in Carrollton, and got married at the Filter Building at White Rock Lake on November 18, 2016. Our son, Preston, arrived in 2019, followed by our daughter, Leighton, in 2021. During early COVID, we moved to Allen, TX to split the difference between our offices in Plano and Frisco. Since then, we’ve both begun working from home.
            </p>
            <p>
              At heart, I’m someone who enjoys the grind of a stable routine and continuous improvement. My fitness, work, and family rhythms are paramount. I like goals, long-term projects, and the kind of consistency that pays off over years, not weeks. That mindset shows up everywhere for me, from parenting to running to engineering.
            </p>
          </SpaceBetween>
        </section>

        <section>
          <SpaceBetween direction="vertical" size="s">
            <Header variant="h2">Masters Runner</Header>
            <p>
              I trained for my first marathon in 2011 and ran the Omaha Marathon in 3:09. I had a plan to run under three hours, but not the fitness to match. The last 10K was a grind, but I pushed through. Not long after, I ran the Athens Classic Marathon in Greece and my first Dallas Marathon, and somewhere along the way I fell in love with the process as much as the results. One year later, I qualified for Boston by running 2:56 at the Chicago Marathon, which opened the door to chasing faster times and bigger goals.
            </p>
            <p>
              In 2013, things took a serious leap forward: I ran 2:40 at Boston and then 2:33 at the California International Marathon. Since then, I’ve run more than 40 marathons, and I’ve learned that it’s the event best suited to my strengths as an athlete. My key milestones include running 2:28 four times—Berlin 2016, Chicago 2018 (2:28:00 PR), Lincoln 2024 at age 39, and Indianapolis 2025 at age 40. I’ve become very comfortable with high-volume training and focused 10–16 week training cycles a couple of times per year.
            </p>
            <p>
              I completed the 6-star Abbott World Marathon Majors medal at the Tokyo Marathon in 2018, and across the World Marathon Majors my average finish time is 2:32. These days, I race as a masters runner, still chasing improvement, still loving the grind, and still finding something deeply satisfying about seeing what long-term discipline can produce.
            </p>
          </SpaceBetween>
        </section>

        <section>
          <SpaceBetween direction="vertical" size="s">
            <Header variant="h2">Software Developer</Header>
            <p>
              I started my career at Raytheon, working on AWIPS II forecasting software for the National Weather Service. I worked on the WarnGen application, which is the tool NWS forecasters use to issue tornado and severe thunderstorm warnings. After moving to Dallas, I joined a small company called Corepoint Health, where I grew into a Principal Software Engineer role working on the Corepoint Integration Engine. Corepoint was (and is) an amazing product, built by an equally amazing leadership team. By the end of that chapter, I had architectural responsibility for Corepoint’s web applications, spanning .NET REST APIs and an Angular frontend.
            </p>
            <p>
              I stayed with the company through M&A, leadership changes, and founder exits as Corepoint became Rhapsody. Between 2021 and 2024, I held a series of roles including Engineering Manager, Director of Engineering overseeing the Corepoint product, and Cloud Engineering Manager, where I led the effort to deliver Corepoint as a PaaS on AWS. In these roles, I really rounded out my servant leadership and product management skills as we began to develop the first cloud-native solutions for our security-minded customers who traditionally relied on on-premises deployments.
            </p>
            <p>
              More recently, I’ve returned to a Principal Software Engineer role building Axon, the LLM-backed intelligence layer for Rhapsody’s chatbots and agentic features. Our stack includes LangGraph, FastAPI, Next.js, and Langfuse, all hosted on AWS. This is a team that genuinely embraces the DevOps mindset—focusing on delivering value rather than the toil of cumbersome process and bureaucracy. It still brings a smile to my face every time I can ship a feature or fix within a few hours.
            </p>
          </SpaceBetween>
        </section>

        <section>
          <Header variant="h2">Links</Header>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem' }}>
            <li>
              <a href="https://www.youtube.com/watch?v=E-AKRn_rxgc" target="_blank" rel="noreferrer">December 2025 Interview</a>
            </li>
            <li>
              <a href="https://www.linkedin.com/in/brentwoodle/" target="_blank" rel="noreferrer">LinkedIn</a>
            </li>
            <li>
              <a href="https://www.strava.com/dashboard" target="_blank" rel="noreferrer">Strava</a>
            </li>
            <li>
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
            </li>
            <li>
              <a href="https://www.tumblr.com/blog/brentwoodle" target="_blank" rel="noreferrer">Old Blog (through 2018)</a>
            </li>
          </ul>
        </section>
      </SpaceBetween>
      <Modal
        visible={Boolean(selectedPhoto)}
        onDismiss={() => setSelectedPhoto(null)}
        header={selectedPhoto?.alt ?? 'Photo'}
        size="large"
      >
        {selectedPhoto && (
          <img
            src={selectedPhoto.fullSrc}
            alt={selectedPhoto.alt}
            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
          />
        )}
      </Modal>
    </Container>
  );
};

export default AboutMe;