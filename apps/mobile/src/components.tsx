import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export function Page({ children }: PropsWithChildren) { return <View style={styles.page}>{children}</View>; }
export function Eyebrow({ children }: PropsWithChildren) { return <Text style={styles.eyebrow}>{children}</Text>; }
export function Title({ children }: PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
export function Card({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) {
  return <Pressable style={styles.card} onPress={onPress}>{children}</Pressable>;
}
export function Avatar({ name, tint = colors.orange }: { name: string; tint?: string }) { return <View style={[styles.avatar,{backgroundColor:tint}]}><Text style={styles.avatarText}>{name.slice(0,1)}</Text></View>; }

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:colors.paper,paddingHorizontal:20,paddingTop:18},
  eyebrow:{fontSize:12,fontWeight:'700',letterSpacing:2,color:colors.orangeDark,textTransform:'uppercase'},
  title:{fontSize:32,lineHeight:40,fontWeight:'700',color:colors.ink,marginTop:6,marginBottom:12},
  card:{backgroundColor:colors.card,borderRadius:20,borderWidth:1,borderColor:colors.line,padding:17,marginBottom:12},
  avatar:{width:50,height:50,borderRadius:18,alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#fff',fontSize:19,fontWeight:'700'},
});
