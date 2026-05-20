import React from 'react';
import styled from 'styled-components';
import Feed from './components/Feed';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Arial', sans-serif;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
`;

const Logo = styled.h1`
  font-size: 28px;
  font-weight: bold;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HeaderIcons = styled.div`
  display: flex;
  gap: 20px;
`;

const Icon = styled.div`
  font-size: 24px;
  cursor: pointer;
  transition: transform 0.2s;
  &:hover {
    transform: scale(1.1);
  }
`;

const FeedContainer = styled.div`
  margin-top: 80px;
  flex: 1;
  overflow-y: auto;
  padding: 10px;
`;

function App() {
  return (
    <AppContainer>
      <Header>
        <Logo>🎥 Reels</Logo>
        <HeaderIcons>
          <Icon>🔍</Icon>
          <Icon>📷</Icon>
        </HeaderIcons>
      </Header>
      <FeedContainer>
        <Feed />
      </FeedContainer>
    </AppContainer>
  );
}

export default App;
