import type { NavigatorScreenParams } from "@react-navigation/native"

export type RootStackParamList = {
  Login: undefined
  Main: NavigatorScreenParams<TabParamList>
  PhotoDetail: { photoId: string }
  About: undefined
  Map: undefined
}

export type TabParamList = {
  Camera: undefined
  Gallery: undefined
  Upload: undefined
  Settings: undefined
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
