import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function RootLayout(){return <><StatusBar style="dark"/><Stack screenOptions={{headerStyle:{backgroundColor:colors.paper},headerShadowVisible:false,headerTintColor:colors.ink}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="friend/[id]" options={{title:'共同经历'}}/><Stack.Screen name="encounter/[id]" options={{title:'这次见面'}}/></Stack></>}
