import { HStack, Text } from '@chakra-ui/react';
import React from 'react';

export const Footer = () => {
  return (
    <HStack align="center">
      <Text fontSize={'12px'}>
        Tarunya LeetSync{' '}
        <Text
          as="a"
          color="blue.500"
          href="https://github.com/TarunyaProgrammer/LeetSync/issues/new/choose"
          target="_blank"
          fontWeight={'semibold'}
        >
          Report an issue
        </Text>{' '}
        | Made with <span style={{ color: '#e25555' }}>&#9829;</span> by{' '}
        <Text
          as="a"
          color="blue.500"
          href="https://github.com/TarunyaProgrammer"
          target="_blank"
          fontWeight={'semibold'}
          display="inline-block"
        >
          @TarunyaProgrammer
        </Text>
      </Text>
    </HStack>
  );
};
