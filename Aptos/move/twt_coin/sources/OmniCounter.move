module OmniCounter::omni_counter {
    struct TwtCoinOne {}

    fun init_module(sender: &signer) {
        aptos_framework::managed_coin::initialize<TwtCoinOne>(
            sender,
            b"Twt Coin",
            b"TWT",
            6,
            false,
        );
    }
}