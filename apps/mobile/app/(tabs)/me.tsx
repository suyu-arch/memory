import { StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Page, Title } from '@/components';
import { colors } from '@/theme';
export default function Me(){return <Page><Eyebrow>账号与隐私</Eyebrow><Title>我的</Title><Card><Text style={s.name}>小满</Text><Text style={s.muted}>demo@example.test</Text></Card><Text style={s.section}>数据与隐私</Text><Card><Text style={s.line}>私人感受始终只有你能看到</Text><Text style={s.line}>照片通过短时签名链接访问</Text><Text style={s.line}>云 AI 只有明确同意后才会启用</Text></Card></Page>}
const s=StyleSheet.create({name:{fontSize:19,fontWeight:'700'},muted:{color:colors.muted,marginTop:5},section:{fontSize:21,fontWeight:'700',marginVertical:18},line:{paddingVertical:8,color:colors.ink}})
