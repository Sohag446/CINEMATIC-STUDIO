pub mod crypto;
pub mod discovery;
pub mod profile_manager;
pub mod pairing;
pub mod ipc;

pub use discovery::{ChromeDiscoveryService, DiscoveredChromeProfile};
pub use profile_manager::{ProfileManager, RegisteredProfile, RegisterProfileDto, UpdateProfileDto, ProfileLifecycleState};
pub use pairing::{PairingService, PairingChallengeDto, VerifyPairingDto, PairingVerificationResult};
pub use ipc::{NativeMessagingIpc, IpcMessage, NATIVE_HOST_NAME, WINDOWS_NAMED_PIPE_NAME};
