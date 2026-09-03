import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/theme';

export default function TabsLayout(){return <Tabs screenOptions={({route})=>({headerShown:false,tabBarActiveTintColor:colors.orangeDark,tabBarInactiveTintColor:colors.muted,tabBarStyle:{height:78,paddingTop:8,paddingBottom:18,borderTopColor:colors.line,backgroundColor:'#fff'},tabBarIcon:({color,size})=><Ionicons name={({index:'home-outline',friends:'people-outline',add:'add-circle-outline',me:'settings-outline'} as const)[route.name as 'index'] ?? 'ellipse-outline'} color={color} size={size}/>})}><Tabs.Screen name="index" options={{title:'首页'}}/><Tabs.Screen name="friends" options={{title:'朋友'}}/><Tabs.Screen name="add" options={{title:'记录'}}/><Tabs.Screen name="me" options={{title:'我的'}}/></Tabs>}
