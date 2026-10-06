import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  Heading,
  Input,
  InputGroup,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { BsGithub } from 'react-icons/bs';
import { SiLeetcode } from 'react-icons/si';
import Logo from '../components/Logo';
import { GithubHandler } from '../handlers';
import { Footer } from './Footer';

const AuthorizeWithGithub = ({ nextStep }: { nextStep: Function }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      await new GithubHandler().connectWithToken(token);
      nextStep();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not connect to GitHub.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack w="100%">
      <VStack pb={4}>
        <Heading size="md">Connect GitHub</Heading>
        <Text color="GrayText" fontSize={'sm'} w="95%" textAlign={'center'}>
          Create a fine-grained GitHub token with <b>Contents: Read and write</b> access to your
          target repository, then paste it here.
        </Text>
      </VStack>
      <FormControl isRequired isInvalid={!!error}>
        <Input
          type="password"
          placeholder="github_pat_..."
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        {!error ? (
          <FormHelperText fontSize="xs">
            GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens.
          </FormHelperText>
        ) : <FormErrorMessage fontSize="xs">{error}</FormErrorMessage>}
      </FormControl>
      <Button
        colorScheme={'blackAlpha'}
        bg="blackAlpha.800"
        w="95%"
        leftIcon={<BsGithub />}
        color="whiteAlpha.900"
        border={'1px solid'}
        borderColor={'gray.200'}
        _hover={{ bg: 'blackAlpha.700' }}
        onClick={handleConnect}
        isLoading={loading}
        isDisabled={!token.trim() || loading}
      >
        Verify GitHub token
      </Button>
      <small>The token is stored locally in this browser and can be revoked at any time.</small>
    </VStack>
  );
};
const AuthorizeWithLeetCode = ({ nextStep }: { nextStep: Function }) => {
  const [leetcodeSession, setLeetcodeSession] = useState<string | null>(null);

  const handleClicked = () => {
    const authUrl = `https://leetcode.com/accounts/login/`;
    chrome.storage.sync.set({ pipe_leethub: true }, () => {
      chrome.tabs.create({ url: authUrl, active: true }, function (x) {
        chrome.tabs.getCurrent(function (tab) {
          if (!tab?.id) return;
          chrome.tabs.remove(tab?.id, function () {});
        });
      });
    });
  };
  useEffect(() => {
    if (leetcodeSession && leetcodeSession.length > 0) {
      nextStep();
    }
  }, [leetcodeSession]);

  useEffect(() => {
    chrome.storage.sync.get(['leetcode_session'], (result) => {
      if (result.leetcode_session) {
        setLeetcodeSession(result.leetcode_session);
      }
    });
  }, []);

  return (
    <VStack w="100%">
      <VStack>
        <Heading size="md">Authorize LeetCode</Heading>
        <Text color="GrayText" fontSize={'sm'} w="90%" textAlign={'center'}>
          To sync your submissions on LeetCode, we need access to your account first.
        </Text>
      </VStack>

      <Button colorScheme={'yellow'} w="100%" onClick={handleClicked} leftIcon={<SiLeetcode />}>
        Login with LeetCode
      </Button>
    </VStack>
  );
};
const SelectRepositoryStep = ({ nextStep }: { nextStep: Function }) => {
  const [repositoryURL, setRepositoryURL] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const handleLinkRepo = async () => {
    const value = repositoryURL.trim();
    if (!value) return setError('Repository URL is required');
    setError(null);
    setLoading(true);
    try {
      await new GithubHandler().linkRepository(value);
      nextStep();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not link repository.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack w="100%">
      <VStack>
        <Heading size="md">Link a Repository</Heading>
        <Text color="GrayText" fontSize={'sm'} w="90%" textAlign={'center'}>
          One last step, we need to know which repository you want to push your code to 🤓
        </Text>
      </VStack>

      {/* If you add the size prop to `InputGroup`, it'll pass it to all its children. */}
      <FormControl isRequired isInvalid={!!error}>
        <InputGroup size="sm">
          <Input
            placeholder="Repository URL"
            value={repositoryURL}
            onChange={(e) => {
              setError(null);
              setRepositoryURL(e.target.value);
            }}
          />
        </InputGroup>
        {!error ? (
          <FormHelperText fontSize={'xs'}>
          Example: https://github.com/your-name/your-repository
          </FormHelperText>
        ) : (
          <FormErrorMessage fontSize={'xs'}>{error}</FormErrorMessage>
        )}
      </FormControl>
      <Button
        colorScheme={'gray'}
        w="100%"
        onClick={handleLinkRepo}
        isLoading={loading}
        isDisabled={loading || !repositoryURL.trim()}
        size="sm"
      >
        Link Repository
      </Button>
      <small>You can change this later.</small>
    </VStack>
  );
};

const StartOnboarding = ({ nextStep }: { nextStep: Function }) => {
  return (
    <VStack w="100%" h="100%" align="center" justify={'center'}>
      <Logo />
      <VStack w="100%">
          <Heading size="lg">Welcome to Tarunya LeetSync 👋</Heading>
        <Text color="GrayText" fontSize={'sm'} w="90%" textAlign={'center'}>
          Sync your accepted LeetCode submissions to your own GitHub repository.
        </Text>
      </VStack>

      <VStack w="100%" py={4}>
        <Button size="md" colorScheme={'green'} w="95%" onClick={() => nextStep()}>
          Complete Setup
        </Button>
        <Text fontSize={'xs'} color="gray.400">
          This will take less than 2 minutes
        </Text>
      </VStack>
      <Footer />
    </VStack>
  );
};

export { StartOnboarding, AuthorizeWithGithub, AuthorizeWithLeetCode, SelectRepositoryStep };
