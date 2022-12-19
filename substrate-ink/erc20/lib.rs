#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod erc20 {
    use ink_storage::{traits::SpreadAllocate, Mapping};
    pub type Result<T> = core::result::Result<T, Error>;

    // ----------
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Return if the balance cannot fulfill a request.
        InsufficientBalance,
        // Return if the allowance cannot fulfill a request.
        InsufficientAllowance,
    }

    /// Create storage for a simple ERC-20 contract.
    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Erc20 {
        /// Total token supply.
        total_supply: Balance,
        /// Mapping from owner to number of owned tokens.
        balances: Mapping<AccountId, Balance>,
        /// Balances that can be transferred by non-owners: (owner, spender) -> allowed
        allowances: Mapping<(AccountId, AccountId), Balance>,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        spender: AccountId,
        value: Balance,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        value: Balance,
    }

    impl Erc20 {
        /// Create a new ERC-20 contract with an initial supply.
        #[ink(constructor)]
        pub fn new(initial_supply: Balance) -> Self {
            // Initialize mapping for the contract.
            ink_lang::utils::initialize_contract(|contract| {
                Self::new_init(contract, initial_supply)
            })
        }

        /// Returns the total token supply.
        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        /// Returns the account balance for the specified `owner`.
        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(owner).unwrap_or_default()
        }

        /// Transfer {amount} of tokens the {to} account
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, amount: Balance) -> Result<()> {
            let caller = self.env().caller();
            self.transfer_from_impl(caller, to, amount)
        }

        #[ink(message)]
        pub fn approve(&mut self, spender: AccountId, value: Balance) -> Result<()> {
            let caller = self.env().caller();
            self.allowances.insert((&caller, &spender), &value);
            self.env().emit_event(Approval {
                owner: caller,
                spender,
                value,
            });
            Ok(())
        }

        #[ink(message)]
        pub fn transfer_from(
            &mut self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<()> {
            let caller = self.env().caller();
            // If caller is different from "from" account, must check allowance
            if caller != from {
                let allowance = self.get_allowance_impl(&from, &caller);
                // Validate there's enough allowance approved for spender account
                if allowance < amount {
                    return Err(Error::InsufficientAllowance);
                }

                self.allowances
                    .insert((&from, &caller), &(allowance - amount));
            }

            self.transfer_from_impl(from, to, amount)
        }

        #[ink(message)]
        pub fn allowance(&self, owner: AccountId, operator: AccountId) -> Balance {
            self.get_allowance_impl(&owner, &operator)
        }

        /// Initialize the ERC-20 contract with the specified initial supply.
        fn new_init(&mut self, initial_supply: Balance) {
            let caller = Self::env().caller();
            self.balances.insert(&caller, &initial_supply);
            self.total_supply = initial_supply;
        }

        fn transfer_from_impl(
            &mut self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<()> {
            // Validate that sender have sufficient amount
            let sender_balance = self.balance_of_impl(&from);
            if sender_balance < amount {
                return Err(Error::InsufficientBalance);
            }

            // Temporarily save receiver balance before transfer
            let receiver_balance = self.balance_of(to);

            // Decrease sender balance
            self.balances.insert(from, &(sender_balance - amount));
            // Increase receiver balance
            self.balances.insert(to, &(receiver_balance + amount));

            // Emit event
            self.env().emit_event(Transfer {
                from,
                to,
                value: amount,
            });
            Ok(())
        }

        #[inline]
        fn balance_of_impl(&self, owner: &AccountId) -> Balance {
            self.balances.get(owner).unwrap_or_default()
        }

        #[inline]
        fn get_allowance_impl(&self, owner: &AccountId, operator: &AccountId) -> Balance {
            self.allowances.get((owner, operator)).unwrap_or_default()
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        use ink_lang as ink;

        #[ink::test]
        fn new_works() {
            let contract = Erc20::new(777);
            assert_eq!(contract.total_supply(), 777);
        }

        #[ink::test]
        fn balance_works() {
            let contract = Erc20::new(100);
            assert_eq!(contract.total_supply(), 100);
            assert_eq!(contract.balance_of(AccountId::from([0x1; 32])), 100);
            assert_eq!(contract.balance_of(AccountId::from([0x0; 32])), 0);
        }

        #[ink::test]
        fn transfer_works() {
            let mut contract = Erc20::new(100);
            let bob = AccountId::from([0x1; 32]);
            let alice = AccountId::from([0x2; 32]);

            contract.transfer(alice, 50);

            assert_eq!(contract.balance_of(alice), 50);
            assert_eq!(contract.balance_of(bob), 50);
        }
    }
}
