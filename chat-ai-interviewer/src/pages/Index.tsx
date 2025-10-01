import { Provider } from 'react-redux';
import { store, persistor } from '@/store/store';
import { PersistGate } from 'redux-persist/integration/react';
import TabLayout from '@/components/TabLayout';

const Index = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TabLayout />
      </PersistGate>
    </Provider>
  );
};

export default Index;