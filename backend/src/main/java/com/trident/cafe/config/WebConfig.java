package com.trident.cafe.config;

import com.trident.cafe.security.AuthFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig {

    @Value("${app.cors.origins}")
    private String allowedOriginsRaw;

    @Autowired
    private AuthFilter authFilter;

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterBean() {
        List<String> origins = Arrays.asList(allowedOriginsRaw.split(","));

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        bean.setOrder(0); // Run before auth filter
        return bean;
    }

    @Bean
    public FilterRegistrationBean<AuthFilter> authFilterBean() {
        FilterRegistrationBean<AuthFilter> bean = new FilterRegistrationBean<>(authFilter);
        bean.addUrlPatterns("/api/*");
        bean.setOrder(1);
        return bean;
    }
}
