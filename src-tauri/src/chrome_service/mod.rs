pub mod crypto;
pub mod discovery;
pub mod ipc;
pub mod pairing;
pub mod profile_manager;

pub use discovery::{ChromeDiscoveryService, DiscoveredChromeProfile};
pub use ipc::{IpcMessage, NativeMessagingIpc, NATIVE_HOST_NAME, WINDOWS_NAMED_PIPE_NAME};
pub use pairing::{
    PairingChallengeDto, PairingService, PairingVerificationResult, VerifyPairingDto,
};
pub use profile_manager::{
    ProfileLifecycleState, ProfileManager, RegisterProfileDto, RegisteredProfile, UpdateProfileDto,
};
