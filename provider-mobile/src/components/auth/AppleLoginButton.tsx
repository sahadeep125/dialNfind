import {
    trackAuthLoginSuccess,
    trackLoginError,
    trackLoginStarted,
    trackUserSignedUp,
    useAnalytics,
} from "@/lib/analytics";
import { showErrorTost } from "@/lib/reactNativeToastMessage";
import { supabase } from "@/lib/supabase";
import { redirectAfterLogin } from "@/utils";
import { useUpdateUsersMutation } from "@/store/api/usersApi";
import { setUser } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/store";
import { borderRadius, colors } from "@/theme";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { moderateScale } from "react-native-size-matters";

const AppleLoginButton = () => {
    const { trackEvent } = useAnalytics();
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isAppleLoading, setIsAppleLoading] = useState(false);
    const [updateUsers] = useUpdateUsersMutation();
    const dispatch = useAppDispatch();
    useEffect(() => {
        AppleAuthentication.isAvailableAsync().then(setIsAvailable);
    }, []);

    const signInWithApple = async () => {
        trackLoginStarted(trackEvent, "apple");
        setIsAppleLoading(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            const { identityToken } = credential;
            if (!identityToken) {
                setIsAppleLoading(false);
                showErrorTost("No identity token");
                throw new Error("No identity token");
            }

            const { error, data } = await supabase.auth.signInWithIdToken({
                provider: "apple",
                token: identityToken,
            });

            if (error) throw error;

            const createdAt = data.user?.created_at ? new Date(data.user.created_at).getTime() : 0;
            const isNewUser = Date.now() - createdAt < 30_000;
            if (isNewUser) {
                trackUserSignedUp(trackEvent, "apple");
            } else {
                trackAuthLoginSuccess(trackEvent, "apple");
            }

            if (credential.fullName?.givenName && credential.fullName?.familyName && data?.session?.user) {
                await updateUsers({
                    userId: data.session.user.id,
                    updateData: { full_name: credential.fullName?.givenName + " " + credential.fullName?.familyName },
                }).unwrap();
                //also update the redux store with the new full name
                dispatch(
                    setUser({
                        ...data.session.user,
                        full_name: credential.fullName?.givenName + " " + credential.fullName?.familyName,
                    })
                );
            }

            setIsAppleLoading(false);
            redirectAfterLogin(isNewUser ? false : true);
        } catch (error: unknown) {
            setIsAppleLoading(false);
            const cancelled =
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                (error as { code: string }).code === "ERR_REQUEST_CANCELED";
            trackLoginError(trackEvent, "apple", error, cancelled);
            if (cancelled) {
                showErrorTost("Apple login canceled");
                return;
            }
            const message = error instanceof Error ? error.message : "Apple login failed";
            showErrorTost(message);
        }
    };

    if (isAvailable !== true) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
            >
                <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={5}
                    style={styles.appleButton}
                    onPress={signInWithApple}
                />
                {isAppleLoading && (
                    <View
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                            width: "100%",
                            height: "100%",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <ActivityIndicator color={colors.primary} size="small" />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        overflow: "hidden",
    },
    appleButton: {
        width: "100%",
        height: moderateScale(50),
        borderRadius: borderRadius.lg,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
});

export default AppleLoginButton;
