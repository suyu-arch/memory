import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, Eyebrow, Page, Title } from '@/components';
import { colors } from '@/theme';
const people=[['lin','小林','18 次见面 · 已共同编辑'],['jie','阿杰','11 次见面 · 还未加入'],['yu','小雨','9 次见面 · 已共同编辑']];
export default function Friends(){return <Page><Eyebrow>共同经历</Eyebrow><Title>朋友</Title><Text style={s.muted}>每一段关系，都有自己的时间线。</Text><ScrollView style={{marginTop:22}}>{people.map(([id,name,meta])=><Card key={id} onPress={()=>router.push(`/friend/${id}`)}><View style={s.row}><Avatar name={name}/><View><Text style={s.name}>{name}</Text><Text style={s.muted}>{meta}</Text></View></View></Card>)}</ScrollView></Page>}
const s=StyleSheet.create({muted:{color:colors.muted},row:{flexDirection:'row',alignItems:'center',gap:14},name:{fontSize:17,fontWeight:'700',marginBottom:5}})
