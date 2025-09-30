import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import TabLayout from '@/components/TabLayout';

const Index = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <TabLayout />
      </PersistGate>
    </Provider>
  );
};

export default Index;