package com.hanbit.api.auth

import com.hanbit.api.post.Author

fun User.toProfile() = UserProfileResponse(
    id = requireNotNull(id),
    email = email,
    name = name,
    verified = verified,
    profileImageUrl = profileImageUrl,
    notifyEventUpdates = notifyEventUpdates,
    notifyComments = notifyComments,
    notifyLikes = notifyLikes,
    passwordChangeRequired = passwordResetRequired,
    role = role,
    praiseRole = praiseRole,
    praiseParts = praiseParts.orEmpty(),
    twoFactorEnabled = totpEnabled,
)

fun User.toAuthorSnapshot() = Author(
    name = name,
    verified = verified,
    profileImageUrl = profileImageUrl,
)

fun User.toAuthResponse(token: String) =
    AuthResponse(token = token, name = name, verified = verified, passwordChangeRequired = passwordResetRequired)
