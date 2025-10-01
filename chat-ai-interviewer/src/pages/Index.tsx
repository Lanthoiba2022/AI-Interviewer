import { Provider } from 'react-redux';
import { store } from '@/store/store';
import TabLayout from '@/components/TabLayout';

const Index = () => {
  return (
    <Provider store={store}>
      <TabLayout />
    </Provider>
  );
};

export default Index;