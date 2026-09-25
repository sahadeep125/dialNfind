import {
    trackAuthLoginSuccess,
    trackLoginError,
    trackLoginStarted,
    trackUserSignedUp,
    useAnalytics,
} from "@/lib/analytics";
import { showErrorTost } from "@/lib/reactNativeToastMessage";
import { supabase } from "@/lib/supabase";
import { borderRadius, colors, spacing, typography } from "@/theme";
import { redirectAfterLogin } from "@/utils";
import { GoogleSignin, SignInResponse, isCancelledResponse } from "@react-native-google-signin/google-signin";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path, SvgProps } from "react-native-svg";
import { moderateScale } from "react-native-size-matters";
WebBrowser.maybeCompleteAuthSession();

const SvgComponent = (props: SvgProps) => (
    <Svg width={moderateScale(15)} height={moderateScale(15)} viewBox="-3 0 262 262" {...props}>
        <Path
            fill="#4285F4"
            d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        />
        <Path
            fill="#34A853"
            d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        />
        <Path
            fill="#FBBC05"
            d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        />
        <Path
            fill="#EB4335"
            d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        />
    </Svg>
);

export default function GoogleLoginButton() {
    const { trackEvent } = useAnalytics();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const signInWithGoogle = async () => {
        try {
            trackLoginStarted(trackEvent, "google");
            setIsGoogleLoading(true);
            await GoogleSignin.hasPlayServices();
            const userInfo: SignInResponse = await GoogleSignin.signIn();

            // In this SDK version, backing out of the account picker resolves with
            // `{ type: 'cancelled' }` rather than throwing — it used to fall through to
            // the generic "No ID token" error below and get reported as a real login
            // failure. Bail out here instead, before any tracking happens.
            if (isCancelledResponse(userInfo)) {
                return;
            }

            const idToken = userInfo.data?.idToken;

            if (!idToken) throw new Error("No ID token");

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: idToken,
            });

            if (error) throw error;

            const createdAt = data.user?.created_at ? new Date(data.user.created_at).getTime() : 0;
            const isNewUser = Date.now() - createdAt < 30_000;
            if (isNewUser) {
                trackUserSignedUp(trackEvent, "google");
            } else {
                trackAuthLoginSuccess(trackEvent, "google");
            }

            redirectAfterLogin(isNewUser ? false : true);
        } catch (error: any) {
            trackLoginError(trackEvent, "google", error);
            showErrorTost(error?.message || "Google login failed. Please try again.");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <TouchableOpacity style={styles.button} onPress={signInWithGoogle} disabled={isGoogleLoading}>
            <View style={styles.inner}>
                <SvgComponent />
                <Text style={styles.text}>
                    {isGoogleLoading ? <ActivityIndicator size="small" color={colors.text} /> : "Continue with Google"}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderWidth: 1,
        borderColor: colors.white,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        width: "100%",
        height: moderateScale(50),
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    inner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: moderateScale(50),
    },
    text: {
        fontSize: typography.fontSize.lg,
        fontFamily: typography.fontFamily.bold,
        color: colors.text,
        marginLeft: spacing.sm,
    },
});
