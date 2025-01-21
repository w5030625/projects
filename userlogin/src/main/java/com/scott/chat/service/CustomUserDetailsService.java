package com.scott.chat.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.scott.chat.model.CustomUserDetails;
import com.scott.chat.model.Member;
import com.scott.chat.repository.MemberRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    
    @Autowired
    private MemberRepository memberRepository;
    
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Member member = memberRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("找不到用戶: " + email));
            
        return new CustomUserDetails(member);
    }
}
