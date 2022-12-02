module coolWallet::omnichain_cool_wallet_coin {
    use aptos_framework::coin::Self;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    use aptos_framework::account;
    
    use aptos_std::type_info;

    use std::signer;
    use std::string::{utf8, String};
    use std::vector;

    use layerzero::endpoint::{Self, UaCapability};
    use layerzero::lzapp;
    use layerzero::remote;

    const ECOUNTER_ALREADY_CREATED: u64 = 0x00;
    const ECOUNTER_NOT_CREATED: u64 = 0x01;
    const ECOUNTER_UNTRUSTED_ADDRESS: u64 = 0x02;

    const PAYLOAD: vector<u8> = vector<u8>[1, 2, 3, 4];

    struct CoolWaletUA {}

    struct Capabilities has key {
        cap: UaCapability<CoolWaletUA>,
    }

    struct CapStore has key{
        mint_cap: coin::MintCapability<OCW>,
        freeze_cap: coin::FreezeCapability<OCW>,
        burn_cap: coin::BurnCapability<OCW>
    }

    struct OCWEventStore has key{
        event_handle: event::EventHandle<String>,
    }

    struct OCW {}

    fun init_module(sender: &signer) {
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<OCW>(   
            sender,
            utf8(b"Omnichain CW"),
            utf8(b"oCW"),
            6,
            false,);
        move_to(sender, CapStore{mint_cap: mint_cap, freeze_cap: freeze_cap, burn_cap: burn_cap});

        let cap = endpoint::register_ua<CoolWaletUA>(sender);
        lzapp::init(sender, cap);
        remote::init(sender);

        move_to(sender, Capabilities { cap });
    }

    /// @dev this needs to be merged with coin register in next v2 realese
    public entry fun register(account: &signer){
        let address_ = signer::address_of(account);
        if(!coin::is_account_registered<OCW>(address_)){
            coin::register<OCW>(account);
        };
        if(!exists<OCWEventStore>(address_)){
            move_to(account, OCWEventStore{event_handle: account::new_event_handle(account)});
        };
    }

    public entry fun bridge(
        account: &signer,
        chain_id: u64,
        fee: u64,
        adapter_params: vector<u8>,
    ) acquires Capabilities, CapStore, OCWEventStore {
        let fee_in_coin = coin::withdraw<AptosCoin>(account, fee);
        let signer_addr = signer::address_of(account);

        let cap = borrow_global<Capabilities>(signer_addr);
        let dst_address = remote::get(@coolWallet, chain_id);
        let (_, refund) = lzapp::send<CoolWaletUA>(chain_id, dst_address, PAYLOAD, fee_in_coin, adapter_params, vector::empty<u8>(), &cap.cap);

        coin::deposit(signer_addr, refund);

        let owner_address = type_info::account_address(&type_info::type_of<OCW>());
        let burn_cap = &borrow_global<CapStore>(owner_address).burn_cap;
        let burn_coin = coin::withdraw<OCW>(account, 1000000);
        coin::burn<OCW>(burn_coin, burn_cap);
        emit_event(signer::address_of(account), utf8(b"burned OCW"));
    }

     public fun quote_fee(dst_chain_id: u64, adapter_params: vector<u8>, pay_in_zro: bool): (u64, u64) {
        endpoint::quote_fee(@coolWallet, dst_chain_id, vector::length(&PAYLOAD), pay_in_zro, adapter_params, vector::empty<u8>())
    }

    public entry fun submit_lz_receive(caller: &signer) acquires CapStore, OCWEventStore {
        let owner_address = type_info::account_address(&type_info::type_of<OCW>());
        assert!(owner_address == signer::address_of(caller),1);

        let mint_cap = &borrow_global<CapStore>(owner_address).mint_cap;
        let mint_coin = coin::mint<OCW>(1000000, mint_cap);
        coin::deposit<OCW>(owner_address, mint_coin);
        emit_event(owner_address, utf8(b"minted OCW"));
    }

    public entry fun lz_receive(chain_id: u64, src_address: vector<u8>, payload: vector<u8>) acquires Capabilities, CapStore, OCWEventStore {
        lz_receive_internal(chain_id, src_address, payload);
    }

    fun lz_receive_internal(src_chain_id: u64, src_address: vector<u8>, payload: vector<u8>): vector<u8> acquires Capabilities, CapStore, OCWEventStore {
        let cap = borrow_global<Capabilities>(@coolWallet);

        remote::assert_remote(@coolWallet, src_chain_id, src_address);
        endpoint::lz_receive<CoolWaletUA>(src_chain_id, src_address, payload, &cap.cap);

        let owner_address = type_info::account_address(&type_info::type_of<OCW>());

        let mint_cap = &borrow_global<CapStore>(owner_address).mint_cap;
        let mint_coin = coin::mint<OCW>(1000000, mint_cap);
        coin::deposit<OCW>(owner_address, mint_coin);
        emit_event(owner_address, utf8(b"minted OCW"));

        payload
    }

    public entry fun retry_payload(src_chain_id: u64, src_address: vector<u8>, nonce: u64, payload: vector<u8>) acquires Capabilities {
        let cap = borrow_global<Capabilities>(@coolWallet);
        lzapp::remove_stored_paylaod<CoolWaletUA>(src_chain_id, src_address, nonce, payload, &cap.cap);

       // burn
    }

     fun emit_event(account: address, msg: String) acquires OCWEventStore{
        event::emit_event<String>(&mut borrow_global_mut<OCWEventStore>(account).event_handle, msg);
    }

}